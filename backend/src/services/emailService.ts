// backend/src/services/emailService.ts
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'Ebeno Research <noreply@ebeno.com>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  logger.warn('⚠️ [email] SMTP non configuré. Les emails ne seront pas envoyés.');
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

const htmlWrapper = (title: string, content: string): string => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f0f2f5;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f2f5;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#4A6CF7 0%,#3651B5 100%);padding:30px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:bold;">🎓 Ebeno Research</h1>
</td></tr>
<tr><td style="padding:30px;">${content}</td></tr>
<tr><td style="background-color:#f8f9fa;padding:20px;text-align:center;border-top:1px solid #e9ecef;">
<p style="color:#6c757d;font-size:12px;margin:0;">Cet email a été envoyé automatiquement par la Plateforme de Recherche Ebeno.</p>
<p style="color:#adb5bd;font-size:11px;margin:12px 0 0 0;">© ${new Date().getFullYear()} Ebeno Research</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const buttonStyle = `display:inline-block;background-color:#4A6CF7;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;margin:20px 0;`;

export interface SendVerificationParams {
  to: string;
  name: string;
  token: string;
}

export const sendVerificationEmail = async ({ to, name, token }: SendVerificationParams): Promise<boolean> => {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    logger.warn(`⚠️ [email] SMTP non configuré, email non envoyé à ${to}`);
    return false;
  }

  const verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

  const content = `
    <h2 style="color:#212529;margin:0 0 16px 0;font-size:22px;">Bienvenue ${name} ! 👋</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Merci de vous être inscrit sur la <strong>Plateforme de Recherche Ebeno</strong>.</p>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Pour activer votre compte, confirmez votre adresse email :</p>
    <div style="text-align:center;"><a href="${verifyUrl}" style="${buttonStyle}">✉️ Vérifier mon email</a></div>
    <p style="color:#6c757d;font-size:13px;margin:20px 0 0 0;">⏱️ Ce lien est valable <strong>24 heures</strong>.</p>
    <p style="color:#6c757d;font-size:11px;background-color:#f8f9fa;padding:10px;border-radius:6px;word-break:break-all;font-family:monospace;margin:8px 0 0 0;">${verifyUrl}</p>
  `;

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject: '✉️ Vérifiez votre email — Ebeno Research',
      html: htmlWrapper('Vérification email', content),
      text: `Bienvenue ${name} !\n\nVérifiez votre email : ${verifyUrl}\n\nValable 24h.`,
    });
    logger.info(`✅ [email] Vérification envoyée à ${to}`);
    return true;
  } catch (error: any) {
    logger.error(`❌ [email] Erreur envoi à ${to}:`, error.message);
    return false;
  }
};

export interface SendPasswordResetParams {
  to: string;
  name: string;
  token: string;
}

export const sendPasswordResetEmail = async ({ to, name, token }: SendPasswordResetParams): Promise<boolean> => {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return false;

  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;

  const content = `
    <h2 style="color:#212529;margin:0 0 16px 0;font-size:22px;">Réinitialisation de mot de passe</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Bonjour ${name},</p>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Cliquez pour réinitialiser votre mot de passe :</p>
    <div style="text-align:center;"><a href="${resetUrl}" style="${buttonStyle}">🔑 Réinitialiser</a></div>
    <p style="color:#d63031;font-size:13px;margin:20px 0 0 0;">⚠️ Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
  `;

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject: '🔑 Réinitialisation de mot de passe — Ebeno Research',
      html: htmlWrapper('Réinitialisation', content),
    });
    return true;
  } catch (error: any) {
    logger.error(`❌ [email] Erreur reset à ${to}:`, error.message);
    return false;
  }
};

export const verifyEmailConnection = async (): Promise<void> => {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return;
  try {
    await transporter.verify();
    logger.info('✅ [email] Connexion SMTP vérifiée');
  } catch (error: any) {
    logger.error('❌ [email] Échec connexion SMTP:', error.message);
  }
};
