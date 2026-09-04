import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

// Private bucket access over the S3 protocol. The bucket is private on purpose: the only door to files is the app proxy (/api/v1/files/...), which enforces the cross-tenant boundary. No provider public URL ever reaches the browser, and guessing an object name isn't enough to read it. S3 credentials are the same for any provider speaking this protocol (Supabase Storage, Cloudflare R2, MinIO, Wasabi), so no vendor name here.

export interface StorageObject {
  body: ReadableStream
  contentType: string
  contentLength: number | null
  etag: string | null
  cacheControl: string | null
}

interface StorageConfig {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

// Read config once on first use, not at module load. At import time one missing env would fail the whole build, though uploads are optional; lazily, only requests actually touching storage fail, with a clear message.
let cachedConfig: StorageConfig | null = null

function readConfig(): StorageConfig {
  if (cachedConfig) return cachedConfig

  const endpoint = process.env.STORAGE_ENDPOINT
  const region = process.env.STORAGE_REGION
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY
  const bucket = process.env.STORAGE_BUCKET

  const missing = Object.entries({
    STORAGE_ENDPOINT: endpoint,
    STORAGE_REGION: region,
    STORAGE_ACCESS_KEY_ID: accessKeyId,
    STORAGE_SECRET_ACCESS_KEY: secretAccessKey,
    STORAGE_BUCKET: bucket,
  })
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length > 0) {
    throw new Error(`Storage belum dikonfigurasi: ${missing.join(', ')} belum diisi`)
  }

  cachedConfig = {
    endpoint: endpoint!,
    region: region!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucket: bucket!,
  }
  return cachedConfig
}

let cachedClient: S3Client | null = null

function client(config: StorageConfig): S3Client {
  if (cachedClient) return cachedClient

  cachedClient = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // Supabase, MinIO, and R2 put the bucket in the path, not a subdomain.
    forcePathStyle: true,
  })
  return cachedClient
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  options: { contentType: string; cacheControl?: string }
): Promise<void> {
  const config = readConfig()
  await client(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: options.contentType,
      CacheControl: options.cacheControl ?? 'private, max-age=31536000, immutable',
    })
  )
}

/** Returns null if the object is absent, rather than throwing. */
export async function getObject(key: string): Promise<StorageObject | null> {
  const config = readConfig()
  try {
    const result = await client(config).send(
      new GetObjectCommand({ Bucket: config.bucket, Key: key })
    )
    if (!result.Body) return null

    return {
      body: (result.Body as { transformToWebStream: () => ReadableStream }).transformToWebStream(),
      contentType: result.ContentType ?? 'application/octet-stream',
      contentLength: result.ContentLength ?? null,
      etag: result.ETag ?? null,
      cacheControl: result.CacheControl ?? null,
    }
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

export async function objectExists(key: string): Promise<boolean> {
  const config = readConfig()
  try {
    await client(config).send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }))
    return true
  } catch (error) {
    if (isNotFound(error)) return false
    throw error
  }
}

export async function deleteObject(key: string): Promise<void> {
  const config = readConfig()
  await client(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
}

export interface ListedObject {
  key: string
  lastModified: Date | null
  size: number
}

// Walk all objects (optionally by prefix), handling pagination. Used by the orphan cleaner; it returns everything, not page by page, because the caller must compare against all referenced keys at once.
export async function listObjects(prefix?: string): Promise<ListedObject[]> {
  const config = readConfig()
  const objects: ListedObject[] = []
  let continuationToken: string | undefined

  do {
    const result = await client(config).send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    )

    for (const item of result.Contents ?? []) {
      if (!item.Key) continue
      objects.push({
        key: item.Key,
        lastModified: item.LastModified ?? null,
        size: item.Size ?? 0,
      })
    }

    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined
  } while (continuationToken)

  return objects
}

function isNotFound(error: unknown): boolean {
  const name = (error as { name?: string })?.name
  const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
  return name === 'NoSuchKey' || name === 'NotFound' || status === 404
}

/** Test-only: force config to be re-read. */
export function __resetStorageForTests(): void {
  cachedConfig = null
  cachedClient = null
}
