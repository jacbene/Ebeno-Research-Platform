// backend/src/services/emailService.ts
import { BrevoClient } from '@getbrevo/brevo';
import { logger } from '../utils/logger';

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const SMTP_FROM = process.env.SMTP_FROM || 'Ebeno Research <noreply@ebeno.com>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const brevo = new BrevoClient({ apiKey: BREVO_API_KEY });

const parseSender = (from: string): { name: string; email: string } => {
  const match = from.match(/^(.+?)\s*<(.+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: 'Ebeno Research', email: from.trim() };
};

const htmlWrapper = (title: string, content: string): string => `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f0f2f5;">
<!-- ... votre template HTML existant ... -->
</body></html>`;

const buttonStyle = `display:inline-block;background-color:#4A6CF7;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;margin:20px 0;`;

export const sendVerificationEmail = async ({ to, name, token }: { to: string; name: string; token: string; }): Promise<boolean> => {
  if (!BREVO_API_KEY) { logger.warn(`⚠️ [email] BREVO_API_KEY non configurée`); return false; }
  const verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const sender = parseSender(SMTP_FROM);
  const content = `<!-- ... votre contenu HTML existant ... -->`;

  try {
    await brevo.transactionalEmails.sendTransacEmail({
      subject: '✉️ Vérifiez votre email — Ebeno Research',
      htmlContent: htmlWrapper('Vérification email', content),
      textContent: `Bienvenue ${name} !\n\nVérifiez votre email : ${verifyUrl}\n\nValable 24h.`,
      sender,
      to: [{ email: to, name }],
    });
    logger.info(`✅ [email] Vérification envoyée à ${to}`);
    return true;
  } catch (error: any) {
    logger.error(`❌ [email] Erreur envoi à ${to}:`, error.message);
    return false;
  }
};

export const sendPasswordResetEmail = async ({ to, name, token }: { to: string; name: string; token: string; }): Promise<boolean> => {
  if (!BREVO_API_KEY) return false;
  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const sender = parseSender(SMTP_FROM);
  const content = `<!-- ... votre contenu HTML existant ... -->`;

  try {
    await brevo.transactionalEmails.sendTransacEmail({
      subject: '🔑 Réinitialisation de mot de passe — Ebeno Research',
      htmlContent: htmlWrapper('Réinitialisation', content),
      sender,
      to: [{ email: to, name }],
    });
    logger.info(`✅ [email] Reset envoyé à ${to}`);
    return true;
  } catch (error: any) {
    logger.error(`❌ [email] Erreur reset à ${to}:`, error.message);
    return false;
  }
};

export const verifyEmailConnection = async (): Promise<void> => {
  if (!BREVO_API_KEY) { logger.warn('⚠️ [email] BREVO_API_KEY non configurée'); return; }
  logger.info('📧 [email] API Brevo configurée (HTTP, port 443)');
};
