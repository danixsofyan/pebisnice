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

export function handleActionError(error: unknown): {
  success: false
  error: string
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

  console.error('[Unexpected Error]', error)

  return { success: false, error: 'Terjadi kesalahan server. Tim kami sudah diberitahu.' }
}

export function errorToResponse(error: unknown): Response {
  if (error instanceof AppError && error.isOperational) {
    return Response.json({ error: error.message, code: error.code }, { status: error.statusCode })
  }

  console.error('[API Error]', error)
  return Response.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 })
}
