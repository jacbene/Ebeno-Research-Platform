// backend/src/services/emailService.ts
// ✅ Migration SMTP → API HTTP Brevo (port 443, jamais bloqué par Render)

import { logger } from '../utils/logger';

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const SMTP_FROM = process.env.SMTP_FROM || 'Ebeno Research <noreply@ebeno.com>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

if (!BREVO_API_KEY) {
  logger.warn('⚠️ [email] BREVO_API_KEY non configurée. Les emails ne seront pas envoyés.');
}

// ────────────────────────────────────────────────────────────
// Utilitaires
// ────────────────────────────────────────────────────────────

const parseSender = (from: string): { name: string; email: string } => {
  const match = from.match(/^(.+?)\s*<(.+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: 'Ebeno Research', email: from.trim() };
};

interface BrevoResponse {
  messageId?: string;
  message?: string;
  code?: string;
}

const sendViaBrevo = async (payload: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  if (!BREVO_API_KEY) {
    return { success: false, error: 'BREVO_API_KEY non configurée' };
  }

  const sender = parseSender(SMTP_FROM);

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: payload.to,
        subject: payload.subject,
        htmlContent: payload.htmlContent,
        textContent: payload.textContent,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as BrevoResponse;

    if (!response.ok) {
      const errMsg = data.message || `HTTP ${response.status}`;
      logger.error(`❌ [email] Brevo API erreur (${response.status}):`, errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true, messageId: data.messageId };
  } catch (error: any) {
    logger.error('❌ [email] Erreur réseau Brevo:', error.message);
    return { success: false, error: error.message };
  }
};

// ────────────────────────────────────────────────────────────
// Template HTML
// ────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────
// Envoi email de vérification
// ────────────────────────────────────────────────────────────

export interface SendVerificationParams {
  to: string;
  name: string;
  token: string;
}

export const sendVerificationEmail = async ({
  to,
  name,
  token,
}: SendVerificationParams): Promise<boolean> => {
  if (!BREVO_API_KEY) {
    logger.warn(`⚠️ [email] BREVO_API_KEY manquante, email non envoyé à ${to}`);
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

  const result = await sendViaBrevo({
    to: [{ email: to, name }],
    subject: '✉️ Vérifiez votre email — Ebeno Research',
    htmlContent: htmlWrapper('Vérification email', content),
    textContent: `Bienvenue ${name} !\n\nVérifiez votre email : ${verifyUrl}\n\nValable 24h.`,
  });

  if (result.success) {
    logger.info(`✅ [email] Vérification envoyée à ${to} (id: ${result.messageId})`);
    return true;
  }

  logger.error(`❌ [email] Échec envoi vérification à ${to}: ${result.error}`);
  return false;
};

// ────────────────────────────────────────────────────────────
// Envoi email de reset password
// ────────────────────────────────────────────────────────────

export interface SendPasswordResetParams {
  to: string;
  name: string;
  token: string;
}

export const sendPasswordResetEmail = async ({
  to,
  name,
  token,
}: SendPasswordResetParams): Promise<boolean> => {
  if (!BREVO_API_KEY) return false;

  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;

  const content = `
    <h2 style="color:#212529;margin:0 0 16px 0;font-size:22px;">Réinitialisation de mot de passe</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Bonjour ${name},</p>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Cliquez pour réinitialiser votre mot de passe :</p>
    <div style="text-align:center;"><a href="${resetUrl}" style="${buttonStyle}">🔑 Réinitialiser</a></div>
    <p style="color:#d63031;font-size:13px;margin:20px 0 0 0;">⚠️ Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
  `;

  const result = await sendViaBrevo({
    to: [{ email: to, name }],
    subject: '🔑 Réinitialisation de mot de passe — Ebeno Research',
    htmlContent: htmlWrapper('Réinitialisation', content),
  });

  if (result.success) {
    logger.info(`✅ [email] Reset envoyé à ${to} (id: ${result.messageId})`);
    return true;
  }

  logger.error(`❌ [email] Échec envoi reset à ${to}: ${result.error}`);
  return false;
};

// ────────────────────────────────────────────────────────────
// Vérification de la configuration (appelé au démarrage)
// ────────────────────────────────────────────────────────────

export const verifyEmailConnection = async (): Promise<void> => {
  if (!BREVO_API_KEY) {
    logger.warn('⚠️ [email] BREVO_API_KEY non configurée — emails désactivés');
    return;
  }

  try {
    // Test léger : on interroge l'endpoint "account" de Brevo
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
      },
    });

    if (response.ok) {
      const data = (await response.json()) as { email?: string; companyName?: string };
      logger.info(`✅ [email] API Brevo OK (compte: ${data.email || 'inconnu'})`);
      return;
    }

    if (response.status === 401) {
      throw new Error('Clé API invalide (401)');
    }

    throw new Error(`Brevo API HTTP ${response.status}`);
  } catch (error: any) {
    logger.error('❌ [email] Vérification API Brevo échouée:', error.message);
    throw error;
  }
};
