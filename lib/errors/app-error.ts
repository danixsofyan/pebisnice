import { logger } from '@/lib/logging/logger'
import { getRequestContext } from '@/lib/observability/request-context'

/**
 * Mencatat error tak terduga secara terstruktur dan mengembalikan requestId.
 *
 * Sengaja memuat nama, pesan, dan stack sebagai bidang terpisah — bukan satu
 * string — supaya bisa dicari dan dikelompokkan di Vercel Logs.
 */
function logUnexpected(error: unknown, message: string): string {
  const requestId = getRequestContext()?.requestId ?? 'unknown'

  logger.error(
    {
      requestId,
      err: {
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error && error.cause ? String(error.cause) : undefined,
      },
    },
    message
  )

  return requestId
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', 400)
  }
}

export class AuthError extends AppError {
  constructor(message = 'Sesi tidak valid. Silakan login kembali.') {
    super(message, 'AUTH_ERROR', 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Anda tidak memiliki izin untuk melakukan tindakan ini.') {
    super(message, 'FORBIDDEN', 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Data tidak ditemukan.') {
    super(message, 'NOT_FOUND', 404)
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Terlalu banyak permintaan. Coba lagi dalam beberapa saat.') {
    super(message, 'RATE_LIMIT', 429)
  }
}

/**
 * Mengubah error menjadi hasil server action yang aman dikirim ke browser.
 *
 * Error operasional (validasi, izin, tidak ditemukan) memang untuk dibaca
 * pengguna. Error tak terduga dicatat lengkap ke log dengan requestId, tetapi
 * yang dikirim balik hanya pesan umum plus id itu — supaya pengguna punya
 * sesuatu untuk disebutkan saat melapor tanpa membocorkan isi sistem.
 */
export function handleActionError(error: unknown): {
  success: false
  error: string
  requestId?: string
  fieldErrors?: Record<string, string[]>
} {
  if (error instanceof ValidationError) {
    const result: { success: false; error: string; fieldErrors?: Record<string, string[]> } = {
      success: false,
      error: error.message,
    }
    if (error.fieldErrors) {
      result.fieldErrors = error.fieldErrors
    }
    return result
  }
  if (error instanceof AppError && error.isOperational) {
    return { success: false, error: error.message }
  }

  const requestId = logUnexpected(error, 'server action failed')

  return {
    success: false,
    error: `Terjadi kesalahan server. Sebutkan kode ini bila melapor: ${requestId}`,
    requestId,
  }
}

export function errorToResponse(error: unknown): Response {
  if (error instanceof AppError && error.isOperational) {
    return Response.json({ error: error.message, code: error.code }, { status: error.statusCode })
  }

  const requestId = logUnexpected(error, 'api route failed')

  return Response.json(
    { error: 'Internal Server Error', code: 'INTERNAL_ERROR', requestId },
    { status: 500 }
  )
}
