import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let _transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  const smtpHost = process.env.SMTP_HOST;

  if (!smtpHost) {
    // Desarrollo sin SMTP configurado → Ethereal automático
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log(`[EmailService] Usando Ethereal — preview en: https://ethereal.email`);
    console.log(`[EmailService] Usuario: ${testAccount.user} / Pass: ${testAccount.pass}`);
    return _transporter;
  }

  // Producción / staging — Resend SMTP relay u otro proveedor SMTP
  _transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: {
      user: process.env.SMTP_USER ?? 'resend',
      pass: process.env.SMTP_PASSWORD ?? '',
    },
  });

  return _transporter;
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const transporter = await getTransporter();
  const from = process.env.EMAIL_FROM ?? 'no-reply@playflow.app';
  const fromName = process.env.EMAIL_FROM_NAME ?? 'PlayFlow';
  const ttlMinutes = Number(process.env.OTP_TTL_MINUTES ?? 10);

  const info = await transporter.sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    subject: 'Tu código de acceso PlayFlow',
    text: [
      `Tu código de acceso es: ${otp}`,
      ``,
      `Este código expira en ${ttlMinutes} minutos.`,
      `No compartas este código con nadie.`,
      ``,
      `Si no solicitaste este código, puedes ignorar este mensaje.`,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="margin: 0 0 24px; font-size: 20px; color: #111;">Tu código de acceso</h2>
        <div style="
          font-size: 40px;
          font-weight: bold;
          letter-spacing: 10px;
          text-align: center;
          padding: 24px;
          background: #f5f5f5;
          border-radius: 8px;
          margin-bottom: 24px;
          color: #111;
        ">${otp}</div>
        <p style="color: #555; font-size: 14px; margin: 0 0 8px;">
          Este código expira en <strong>${ttlMinutes} minutos</strong>.
        </p>
        <p style="color: #555; font-size: 14px; margin: 0 0 8px;">
          No compartas este código con nadie.
        </p>
        <p style="color: #999; font-size: 12px; margin: 24px 0 0;">
          Si no solicitaste este código, puedes ignorar este mensaje.
        </p>
      </div>
    `,
  });

  // En dev con Ethereal, mostrar la URL de preview en consola
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[EmailService] Preview OTP para ${to}: ${previewUrl}`);
  }
}
