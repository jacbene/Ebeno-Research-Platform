// backend/src/services/emailService.ts
// ✅ API HTTP Brevo (port 443) + branding "Ebeno Research Platform" + 6 emails

import { logger } from '../utils/logger';
import {
  EMAIL_STRINGS,
  Lang,
  normalizeLang,
  interpolate,
} from './emailTemplates';

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const EMAIL_FROM = process.env.SMTP_FROM || 'Ebeno Research Platform <noreply@ebeno.com>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// ✅ Brand : JAMAIS traduit, JAMAIS abrégé
const BRAND_NAME = 'Ebeno Research Platform';

if (!BREVO_API_KEY) {
  logger.warn('⚠️ [email] BREVO_API_KEY non configurée. Les emails ne seront pas envoyés.');
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const parseSender = (from: string): { name: string; email: string } => {
  const match = from.match(/^(.+?)\s*<(.+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: BRAND_NAME, email: from.trim() };
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
  if (!BREVO_API_KEY) return { success: false, error: 'BREVO_API_KEY non configurée' };

  const sender = parseSender(EMAIL_FROM);

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
     body: JSON.stringify({
  sender,
  to: payload.to,
  subject: payload.subject,
  htmlContent: payload.htmlContent,
  textContent: payload.textContent,
  headers: {
    'X-Priority': '1',
    'X-MSMail-Priority': 'High',
    'Importance': 'high',
  },
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

const buttonStyle = `display:inline-block;background-color:#4A6CF7;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;margin:20px 0;`;

// ────────────────────────────────────────────────────────────
// Template HTML — branding fixe + tagline traduite
// ────────────────────────────────────────────────────────────

const htmlWrapper = (content: string, lang: Lang): string => {
  const S = EMAIL_STRINGS[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${BRAND_NAME}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f0f2f5;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f2f5;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

<!-- ✅ HEADER : nom fixe + tagline traduite -->
<tr><td style="background:linear-gradient(135deg,#4A6CF7 0%,#3651B5 100%);padding:30px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:bold;letter-spacing:0.2px;">🎓 ${BRAND_NAME}</h1>
<p style="color:#ffffffcc;margin:8px 0 0;font-size:14px;">${S.tagline}</p>
</td></tr>

<!-- CONTENU -->
<tr><td style="padding:30px;">${content}</td></tr>

<!-- ✅ FOOTER : note + tagline + copyright -->
<tr><td style="background-color:#f8f9fa;padding:20px;text-align:center;border-top:1px solid #e9ecef;">
<p style="color:#6c757d;font-size:12px;margin:0;line-height:1.5;">${S.footerNote}</p>
<p style="color:#6c757d;font-size:12px;margin:8px 0 0;font-weight:500;">${S.tagline}</p>
<p style="color:#adb5bd;font-size:11px;margin:12px 0 0 0;">© ${year} ${BRAND_NAME}</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

// ────────────────────────────────────────────────────────────
// 1. Vérification email
// ────────────────────────────────────────────────────────────

export interface SendVerificationParams {
  to: string;
  name: string;
  token: string;
  lang?: string;
}

export const sendVerificationEmail = async ({
  to,
  name,
  token,
  lang,
}: SendVerificationParams): Promise<boolean> => {
  if (!BREVO_API_KEY) {
    logger.warn(`⚠️ [email] BREVO_API_KEY manquante, email non envoyé à ${to}`);
    return false;
  }

  const L = normalizeLang(lang);
  const S = EMAIL_STRINGS[L];
  const verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

  const content = `
    <h2 style="color:#212529;margin:0 0 16px 0;font-size:22px;">${interpolate(S.verificationGreeting, { name })}</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">${S.verificationIntro}</p>
    <div style="text-align:center;"><a href="${verifyUrl}" style="${buttonStyle}">${S.verificationButton}</a></div>
    <p style="color:#6c757d;font-size:13px;margin:20px 0 0 0;">${S.verificationValidFor}</p>
    <p style="color:#6c757d;font-size:11px;background-color:#f8f9fa;padding:10px;border-radius:6px;word-break:break-all;font-family:monospace;margin:8px 0 0 0;">${verifyUrl}</p>
  `;

  const result = await sendViaBrevo({
    to: [{ email: to, name }],
    subject: S.verificationSubject,
    htmlContent: htmlWrapper(content, L),
    textContent: `${interpolate(S.verificationGreeting, { name })}\n\n${S.verificationIntro}\n${verifyUrl}\n\n${S.verificationValidFor}`,
  });

  if (result.success) {
    logger.info(`✅ [email] Vérification envoyée à ${to} [${L}] (id: ${result.messageId})`);
    return true;
  }
  logger.error(`❌ [email] Échec vérification à ${to}: ${result.error}`);
  return false;
};

// ────────────────────────────────────────────────────────────
// 2. Reset password
// ────────────────────────────────────────────────────────────

export interface SendPasswordResetParams {
  to: string;
  name: string;
  token: string;
  lang?: string;
}

export const sendPasswordResetEmail = async ({
  to,
  name,
  token,
  lang,
}: SendPasswordResetParams): Promise<boolean> => {
  if (!BREVO_API_KEY) return false;

  const L = normalizeLang(lang);
  const S = EMAIL_STRINGS[L];
  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;

  const content = `
    <h2 style="color:#212529;margin:0 0 16px 0;font-size:22px;">${S.resetHeading}</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">${interpolate(S.resetGreeting, { name })}</p>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">${S.resetIntro}</p>
    <div style="text-align:center;"><a href="${resetUrl}" style="${buttonStyle}">${S.resetButton}</a></div>
    <p style="color:#d63031;font-size:13px;margin:20px 0 0 0;">${S.resetWarning}</p>
  `;

  const result = await sendViaBrevo({
    to: [{ email: to, name }],
    subject: S.resetSubject,
    htmlContent: htmlWrapper(content, L),
  });

  if (result.success) {
    logger.info(`✅ [email] Reset envoyé à ${to} [${L}] (id: ${result.messageId})`);
    return true;
  }
  logger.error(`❌ [email] Échec reset à ${to}: ${result.error}`);
  return false;
};

// ────────────────────────────────────────────────────────────
// 3. Nouveau membre ajouté à un projet
// ────────────────────────────────────────────────────────────

export interface SendProjectMemberAddedParams {
  to: string;
  name: string;
  projectName: string;
  ownerName: string;
  projectId: string;
  lang?: string;
}

export const sendProjectMemberAddedEmail = async ({
  to,
  name,
  projectName,
  ownerName,
  projectId,
  lang,
}: SendProjectMemberAddedParams): Promise<boolean> => {
  if (!BREVO_API_KEY) return false;

  const L = normalizeLang(lang);
  const S = EMAIL_STRINGS[L];
  const projectUrl = `${APP_URL}/project/${projectId}`;

  const content = `
    <h2 style="color:#212529;margin:0 0 16px 0;font-size:22px;">${S.memberAddedHeading}</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">${interpolate(S.memberAddedGreeting, { name })}</p>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">${interpolate(S.memberAddedIntro, { owner: ownerName, project: projectName })}</p>
    <div style="text-align:center;"><a href="${projectUrl}" style="${buttonStyle}">${S.memberAddedButton}</a></div>
    <p style="color:#6c757d;font-size:13px;margin:20px 0 0 0;">${S.memberAddedNote}</p>
  `;

  const result = await sendViaBrevo({
    to: [{ email: to, name }],
    subject: interpolate(S.memberAddedSubject, { project: projectName }),
    htmlContent: htmlWrapper(content, L),
  });

  if (result.success) {
    logger.info(`✅ [email] Member-added envoyé à ${to} [${L}] (id: ${result.messageId})`);
    return true;
  }
  logger.error(`❌ [email] Échec member-added à ${to}: ${result.error}`);
  return false;
};

// ────────────────────────────────────────────────────────────
// 4. Transcription terminée
// ────────────────────────────────────────────────────────────

export interface SendTranscriptionCompleteParams {
  to: string;
  name: string;
  transcriptionTitle: string;
  projectId: string;
  lang?: string;
}

export const sendTranscriptionCompleteEmail = async ({
  to,
  name,
  transcriptionTitle,
  projectId,
  lang,
}: SendTranscriptionCompleteParams): Promise<boolean> => {
  if (!BREVO_API_KEY) return false;

  const L = normalizeLang(lang);
  const S = EMAIL_STRINGS[L];
  const url = `${APP_URL}/transcriptions?projectId=${projectId}`;

  const content = `
    <h2 style="color:#212529;margin:0 0 16px 0;font-size:22px;">${S.transcriptionHeading}</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">${interpolate(S.transcriptionGreeting, { name })}</p>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">${interpolate(S.transcriptionIntro, { title: transcriptionTitle })}</p>
    <div style="text-align:center;"><a href="${url}" style="${buttonStyle}">${S.transcriptionButton}</a></div>
    <p style="color:#6c757d;font-size:13px;margin:20px 0 0 0;">${S.transcriptionNote}</p>
  `;

  const result = await sendViaBrevo({
    to: [{ email: to, name }],
    subject: interpolate(S.transcriptionSubject, { title: transcriptionTitle }),
    htmlContent: htmlWrapper(content, L),
  });

  if (result.success) {
    logger.info(`✅ [email] Transcription-complete envoyé à ${to} [${L}]`);
    return true;
  }
  logger.error(`❌ [email] Échec transcription-complete à ${to}: ${result.error}`);
  return false;
};

// ────────────────────────────────────────────────────────────
// 5. Résumé IA prêt
// ────────────────────────────────────────────────────────────

export interface SendSummaryReadyParams {
  to: string;
  name: string;
  summaryTitle: string;
  summaryExcerpt: string;
  projectId: string;
  lang?: string;
}

export const sendSummaryReadyEmail = async ({
  to,
  name,
  summaryTitle,
  summaryExcerpt,
  projectId,
  lang,
}: SendSummaryReadyParams): Promise<boolean> => {
  if (!BREVO_API_KEY) return false;

  const L = normalizeLang(lang);
  const S = EMAIL_STRINGS[L];
  const url = `${APP_URL}/project/${projectId}`;

  // Tronquer l'extrait à 300 chars
  const excerpt =
    summaryExcerpt.length > 300
      ? summaryExcerpt.substring(0, 300).trim() + '…'
      : summaryExcerpt;

  const content = `
    <h2 style="color:#212529;margin:0 0 16px 0;font-size:22px;">${S.summaryHeading}</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">${interpolate(S.summaryGreeting, { name })}</p>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">${interpolate(S.summaryIntro, { title: summaryTitle })}</p>
    <div style="background-color:#f8f9fa;border-left:3px solid #4A6CF7;padding:14px 16px;border-radius:6px;margin:20px 0;">
      <p style="color:#495057;font-size:13px;margin:0 0 6px 0;font-weight:bold;">${S.summaryExcerptTitle}</p>
      <p style="color:#495057;font-size:14px;line-height:1.6;margin:0;font-style:italic;">${excerpt}</p>
    </div>
    <div style="text-align:center;"><a href="${url}" style="${buttonStyle}">${S.summaryButton}</a></div>
    <p style="color:#6c757d;font-size:13px;margin:20px 0 0 0;">${S.summaryNote}</p>
  `;

  const result = await sendViaBrevo({
    to: [{ email: to, name }],
    subject: interpolate(S.summarySubject, { title: summaryTitle }),
    htmlContent: htmlWrapper(content, L),
  });

  if (result.success) {
    logger.info(`✅ [email] Summary-ready envoyé à ${to} [${L}]`);
    return true;
  }
  logger.error(`❌ [email] Échec summary-ready à ${to}: ${result.error}`);
  return false;
};

// ────────────────────────────────────────────────────────────
// 7. Suppression de compte planifiée
// ────────────────────────────────────────────────────────────

export interface SendDeletionScheduledParams {
  to: string;
  name: string;
  cancelToken: string;
  scheduledDate: string; // ISO
  lang?: string;
}

export const sendDeletionScheduledEmail = async ({
  to,
  name,
  cancelToken,
  scheduledDate,
  lang,
}: SendDeletionScheduledParams): Promise<boolean> => {
  if (!BREVO_API_KEY) return false;

  const L = normalizeLang(lang);
  const S = EMAIL_STRINGS[L];
  const cancelUrl = `${APP_URL}/cancel-deletion?token=${encodeURIComponent(cancelToken)}`;

  // Formatter la date selon la langue
  const dateObj = new Date(scheduledDate);
  const formattedDate = dateObj.toLocaleDateString(
    L === 'ar' ? 'ar-EG' : L === 'pt' ? 'pt-BR' : L === 'es' ? 'es-ES' : L === 'en' ? 'en-US' : 'fr-FR',
    { day: 'numeric', month: 'long', year: 'numeric' }
  );

  const content = `
    <h2 style="color:#212529;margin:0 0 16px 0;font-size:22px;">${S.deletionHeading}</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">${interpolate(S.deletionGreeting, { name })}</p>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 16px 0;">${S.deletionIntro}</p>
    <div style="background-color:#FFF3CD;border-left:3px solid #FFC107;padding:14px 16px;border-radius:6px;margin:20px 0;">
      <p style="color:#856404;font-size:14px;line-height:1.6;margin:0;">${interpolate(S.deletionDateLine, { date: formattedDate })}</p>
    </div>
    <div style="background-color:#FEE2E2;border-left:3px solid #EF4444;padding:14px 16px;border-radius:6px;margin:20px 0;">
    <p style="color:#991B1B;font-size:13px;line-height:1.6;margin:0;">${S.emailSpamWarning}</p>
    </div>
    <p style="color:#d63031;font-size:14px;line-height:1.6;margin:0 0 24px 0;">${S.deletionWarning}</p>
    <div style="text-align:center;"><a href="${cancelUrl}" style="${buttonStyle}">${S.deletionCancelButton}</a></div>
    <p style="color:#6c757d;font-size:12px;margin:20px 0 0 0;">${S.deletionConfirmText}</p>
    <p style="color:#6c757d;font-size:11px;background-color:#f8f9fa;padding:10px;border-radius:6px;word-break:break-all;font-family:monospace;margin:8px 0 0 0;">${cancelUrl}</p>
  `;

  const result = await sendViaBrevo({
  to: [{ email: to, name }],
  subject: S.deletionSubject,
  htmlContent: htmlWrapper(content, L),
  });

  if (result.success) {
    logger.info(`✅ [email] Deletion-scheduled envoyé à ${to} [${L}]`);
    return true;
  }
  logger.error(`❌ [email] Échec deletion-scheduled à ${to}: ${result.error}`);
  return false;
};

// ────────────────────────────────────────────────────────────
// 6. Vérification config (démarrage)
// ────────────────────────────────────────────────────────────

export const verifyEmailConnection = async (): Promise<void> => {
  if (!BREVO_API_KEY) {
    logger.warn('⚠️ [email] BREVO_API_KEY non configurée — emails désactivés');
    return;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: { accept: 'application/json', 'api-key': BREVO_API_KEY },
    });

    if (response.ok) {
      const data = (await response.json()) as { email?: string };
      logger.info(`✅ [email] API Brevo OK (compte: ${data.email || 'inconnu'})`);
      return;
    }
    if (response.status === 401) throw new Error('Clé API invalide (401)');
    throw new Error(`Brevo API HTTP ${response.status}`);
  } catch (error: any) {
    logger.error('❌ [email] Vérification API Brevo échouée:', error.message);
    throw error;
  }
};
