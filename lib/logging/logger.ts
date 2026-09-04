import pino, { type LoggerOptions } from 'pino'
import { getRequestContext } from '@/lib/observability/request-context'

// Structured app-wide logger. Every line is one-line JSON with uniform fields for filtering and correlation in Vercel Logs, not free text. Always: level, time, service, env, msg. When the request is known: requestId, method, path, userId, projectId.

const SERVICE_NAME = 'pebisnice'

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',

  base: {
    service: SERVICE_NAME,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  },

  // ISO 8601 UTC time so it sorts across systems.
  timestamp: pino.stdTimeFunctions.isoTime,

  formatters: {
    // Vercel Logs groups by `level` as text, not a number.
    level: (label) => ({ level: label }),
  },

  // Fields that must never appear in logs; nested paths included, since error and request objects often carry whole headers and payloads.
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
      '*.signature_key',
      '*.signatureKey',
      '*.va_numbers',
      '*.card',
      '*.cvv',
      '*.pin',
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

// Logger that auto-carries the running request context; used like a normal logger.info(...), with requestId/path/userId/projectId added when available.
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

/** For places needing the raw pino instance, e.g. tests. */
export const baseLogger = rootLogger
