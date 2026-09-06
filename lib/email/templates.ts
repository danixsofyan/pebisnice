import type { EmailMessage } from './mailer'

// HTML-escape any value interpolated into an email body, so a project name or role label can't
// inject markup.
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manajer',
  finance: 'Keuangan',
  cashier: 'Kasir',
  production: 'Produksi',
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

export function teamInviteEmail(params: {
  to: string
  projectName: string
  role: string
  loginUrl: string
}): EmailMessage {
  const project = esc(params.projectName)
  const role = esc(roleLabel(params.role))
  const url = esc(params.loginUrl)

  const subject = `Undangan bergabung ke ${params.projectName} di Pebisnice`

  const text = [
    `Anda diundang bergabung ke "${params.projectName}" di Pebisnice sebagai ${roleLabel(params.role)}.`,
    '',
    `Masuk dengan akun Google yang memakai alamat email ini (${params.to}) untuk menerima undangan:`,
    params.loginUrl,
    '',
    'Jika Anda tidak mengenali undangan ini, abaikan email ini.',
  ].join('\n')

  const html = `<!doctype html>
<html lang="id"><body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;color:#18181b">
  <div style="max-width:480px;margin:24px auto;background:#fff;border-radius:12px;padding:32px">
    <h1 style="font-size:18px;margin:0 0 16px">Undangan bergabung</h1>
    <p style="font-size:14px;line-height:1.6;color:#3f3f46">
      Anda diundang bergabung ke <strong>${project}</strong> di Pebisnice sebagai <strong>${role}</strong>.
    </p>
    <p style="font-size:14px;line-height:1.6;color:#3f3f46">
      Masuk dengan akun Google yang memakai alamat email ini untuk menerima undangan.
    </p>
    <p style="margin:24px 0">
      <a href="${url}" style="display:inline-block;background:#0b0b0c;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px">Masuk ke Pebisnice</a>
    </p>
    <p style="font-size:12px;color:#a1a1aa">
      Jika Anda tidak mengenali undangan ini, abaikan email ini.
    </p>
  </div>
</body></html>`

  return { to: params.to, subject, text, html }
}
