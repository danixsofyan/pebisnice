import pino, { type LoggerOptions } from 'pino'
import { getRequestContext } from '@/lib/observability/request-context'

/**
 * Logger terstruktur untuk seluruh aplikasi.
 *
 * Setiap baris keluar sebagai JSON satu baris dengan bidang yang seragam,
 * supaya bisa difilter dan dikorelasikan di Vercel Logs — bukan teks bebas
 * yang hanya bisa dibaca manusia.
 *
 * Bidang yang selalu ada:
 *   level, time, service, env, msg
 * Bidang yang ikut bila requestnya diketahui:
 *   requestId, method, path, userId, projectId
 */

const SERVICE_NAME = 'pebisnice'

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',

  base: {
    service: SERVICE_NAME,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  },

  // Waktu ISO 8601 UTC agar bisa diurutkan lintas sistem.
  timestamp: pino.stdTimeFunctions.isoTime,

  formatters: {
    // Vercel Logs mengelompokkan berdasarkan `level` sebagai teks, bukan angka.
    level: (label) => ({ level: label }),
  },

  /**
   * Bidang yang tidak boleh muncul di log dalam keadaan apa pun.
   *
   * Daftarnya menyebut jalur bersarang juga, karena objek error dan request
   * kerap membawa header serta payload utuh.
   */
  redact: {
    paths: [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'encryptedAccessToken',
      'encryptedRefreshToken',
      'authTag',
      'secret',
      'apiKey',
      'creditCard',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      '*.password',
      '*.secret',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
}

if (process.env.NODE_ENV === 'development') {
  options.transport = {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname,service,env' },
  }
}

const rootLogger = pino(options)

/**
 * Logger yang otomatis membawa konteks request yang sedang berjalan.
 *
 * Dipakai sebagai `logger.info(...)` biasa; bidang requestId, path, userId,
 * dan projectId disisipkan sendiri bila tersedia.
 */
function withRequestContext() {
  const context = getRequestContext()
  if (!context) return rootLogger

  return rootLogger.child({
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    ...(context.userId ? { userId: context.userId } : {}),
    ...(context.projectId ? { projectId: context.projectId } : {}),
  })
}

type LogFn = (obj: object | string, msg?: string) => void

function forward(level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'): LogFn {
  return (obj, msg) => {
    const target = withRequestContext()
    if (typeof obj === 'string') {
      target[level](obj)
      return
    }
    target[level](obj, msg)
  }
}

export const logger = {
  trace: forward('trace'),
  debug: forward('debug'),
  info: forward('info'),
  warn: forward('warn'),
  error: forward('error'),
  fatal: forward('fatal'),
}

/** Untuk tempat yang butuh instance pino asli, mis. pengujian. */
export const baseLogger = rootLogger
