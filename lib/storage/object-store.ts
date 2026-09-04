import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

/**
 * Akses bucket privat lewat protokol S3.
 *
 * Bucket sengaja privat: satu-satunya pintu ke berkas adalah proxy aplikasi
 * (`/api/v1/files/...`), yang menegakkan batas antar-tenant. Tidak ada URL
 * publik penyedia yang pernah sampai ke browser, dan menebak nama objek tidak
 * cukup untuk membacanya.
 *
 * Kredensial S3 sama untuk penyedia apa pun yang berbicara protokol ini
 * (Supabase Storage, Cloudflare R2, MinIO, Wasabi), jadi tidak ada nama vendor
 * di sini.
 */

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

/**
 * Membaca konfigurasi sekali saat pertama dipakai, bukan saat modul dimuat.
 *
 * Kalau dibaca saat impor, satu env yang belum diisi akan menggagalkan build
 * seluruh aplikasi — padahal fitur unggah bersifat opsional. Dengan lazy, hanya
 * permintaan yang benar-benar menyentuh storage yang gagal, dengan pesan jelas.
 */
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
    // Supabase, MinIO, dan R2 memakai jalur bucket di path, bukan subdomain.
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

/** Mengembalikan `null` bila objek tidak ada, bukan melempar. */
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

function isNotFound(error: unknown): boolean {
  const name = (error as { name?: string })?.name
  const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
  return name === 'NoSuchKey' || name === 'NotFound' || status === 404
}

/** Hanya untuk test — memaksa konfigurasi dibaca ulang. */
export function __resetStorageForTests(): void {
  cachedConfig = null
  cachedClient = null
}
