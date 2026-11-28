import nodemailer from 'nodemailer';
import { env } from '@/config/env';
import { logger } from './logger';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

let transporter: MailTransporter | null = null;

function getTransporter(): MailTransporter | null {
  if (transporter) return transporter;

  if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_PORT === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASSWORD
          ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
          : undefined,
    });
  }

  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const mailTransporter = getTransporter();
  const from = env.EMAIL_FROM || 'noreply@careerportal.local';

  if (!mailTransporter) {
    logger.info(
      {
        to: options.to,
        subject: options.subject,
        preview: options.text || options.html?.slice(0, 100),
      },
      '[LOCAL DEV/MOCK EMAIL] Outgoing email dispatched to logger (SMTP unconfigured)',
    );
    return true;
  }

  try {
    await mailTransporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    logger.info({ to: options.to, subject: options.subject }, 'Email sent successfully via SMTP');
    return true;
  } catch (error) {
    logger.error({ error, to: options.to, subject: options.subject }, 'Failed to send email via SMTP');
    return false;
  }
}

