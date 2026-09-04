// Legacy asset entry point. The public-URL model is gone: the bucket is now private and uploads are read only via the tenant-scoped proxy at app/api/v1/files/[...key]. See lib/storage/object-key.ts to build the proxy URL and lib/storage/object-store.ts to read/write objects.

export { fileProxyUrl } from '@/lib/storage/object-key'

// Login page background, kept in the repo. It used to come from Supabase Storage, tying it to one project: when the database moved projects the image vanished. A decorative asset that never changes belongs with the code, needs no env, doesn't break when infra moves, and is served by Vercel's CDN.
export const LOGIN_BACKGROUND = '/login-background.webp'
