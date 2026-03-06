import pino from 'pino'

import { type LoggerOptions } from 'pino'

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',

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
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
}

if (process.env.NODE_ENV === 'development') {
  options.transport = {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss.l' },
  }
}

export const logger = pino(options)
