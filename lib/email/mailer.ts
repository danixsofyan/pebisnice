import nodemailer, { type Transporter } from 'nodemailer'
import { logger } from '@/lib/logging/logger'

// SMTP email sender (Brevo relay in production). Credentials come from env only — never hard-coded.
// If SMTP isn't configured (e.g. local dev), sending is a logged no-op so features that trigger
// email still work.

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

function readSmtpConfig() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass || !Number.isInteger(port) || port <= 0) return null
  return { host, port, user, pass }
}

export function isEmailConfigured(): boolean {
  return readSmtpConfig() !== null
}

let cached: Transporter | null = null

function transporter(): Transporter | null {
  if (cached) return cached
  const config = readSmtpConfig()
  if (!config) return null
  cached = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465, // 587 uses STARTTLS, negotiated automatically
    auth: { user: config.user, pass: config.pass },
  })
  return cached
}

// Send an email. Returns {sent:false} when SMTP is unconfigured (no throw) so callers can degrade
// gracefully; throws only on an actual transport/delivery failure.
export async function sendEmail(message: EmailMessage): Promise<{ sent: boolean }> {
  const tx = transporter()
  const from = process.env.EMAIL_FROM
  if (!tx || !from) {
    logger.warn(
      { to: message.to, subject: message.subject },
      'SMTP or EMAIL_FROM not configured; email skipped'
    )
    return { sent: false }
  }
  await tx.sendMail({
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  })
  logger.info({ to: message.to, subject: message.subject }, 'email sent')
  return { sent: true }
}
