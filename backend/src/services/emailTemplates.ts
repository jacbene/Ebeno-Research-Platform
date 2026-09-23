// backend/src/services/emailTemplates.ts
// ✅ Toutes les chaînes traduites pour les emails Ebeno Research Platform

export type Lang = 'fr' | 'en' | 'es' | 'pt' | 'ar';

export const SUPPORTED_LANGS: Lang[] = ['fr', 'en', 'es', 'pt', 'ar'];

/** Normalise "fr-FR" → "fr", "xx" → "fr" */
export const normalizeLang = (l?: string): Lang => {
  const code = (l || 'fr').split('-')[0].toLowerCase();
  return (SUPPORTED_LANGS.includes(code as Lang) ? code : 'fr') as Lang;
};

/** Remplace {var} dans un template */
export const interpolate = (
  template: string,
  vars: Record<string, string | number>
): string =>
  template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

export interface EmailStrings {
  // Commun
  tagline: string;
  footerNote: string;
  managePreferences: string;

  // Vérification email
  verificationSubject: string;
  verificationHeading: string;
  verificationGreeting: string;
  verificationIntro: string;
  verificationButton: string;
  verificationValidFor: string;

  // Reset password
  resetSubject: string;
  resetHeading: string;
  resetGreeting: string;
  resetIntro: string;
  resetButton: string;
  resetWarning: string;

  // Membre ajouté à un projet
  memberAddedSubject: string;
  memberAddedHeading: string;
  memberAddedGreeting: string;
  memberAddedIntro: string;
  memberAddedButton: string;
  memberAddedNote: string;

  // Transcription terminée
  transcriptionSubject: string;
  transcriptionHeading: string;
  transcriptionGreeting: string;
  transcriptionIntro: string;
  transcriptionButton: string;
  transcriptionNote: string;

  // Résumé IA prêt
  summarySubject: string;
  summaryHeading: string;
  summaryGreeting: string;
  summaryIntro: string;
  summaryExcerptTitle: string;
  summaryButton: string;
  summaryNote: string;
}

export const EMAIL_STRINGS: Record<Lang, EmailStrings> = {
  fr: {
    tagline: 'Plateforme de recherche collaborative',
    footerNote: 'Cet email a été envoyé automatiquement par Ebeno Research Platform.',
    managePreferences: 'Gérer mes préférences d\'emails',

    verificationSubject: '✉️ Vérifiez votre email — Ebeno Research Platform',
    verificationHeading: 'Vérification email',
    verificationGreeting: 'Bienvenue {name} ! 👋',
    verificationIntro: 'Merci de vous être inscrit sur Ebeno Research Platform. Pour activer votre compte, confirmez votre adresse email :',
    verificationButton: '✉️ Vérifier mon email',
    verificationValidFor: '⏱️ Ce lien est valable 24 heures.',

    resetSubject: '🔑 Réinitialisation de mot de passe — Ebeno Research Platform',
    resetHeading: 'Réinitialisation de mot de passe',
    resetGreeting: 'Bonjour {name},',
    resetIntro: 'Cliquez ci-dessous pour réinitialiser votre mot de passe :',
    resetButton: '🔑 Réinitialiser mon mot de passe',
    resetWarning: '⚠️ Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message.',

    memberAddedSubject: '👥 Nouveau projet : {project}',
    memberAddedHeading: 'Nouveau projet',
    memberAddedGreeting: 'Bonjour {name},',
    memberAddedIntro: '{owner} vous a ajouté au projet « {project} » sur Ebeno Research Platform.',
    memberAddedButton: '📂 Ouvrir le projet',
    memberAddedNote: 'Vous pouvez maintenant collaborer sur les documents, memos et transcriptions de ce projet.',

    transcriptionSubject: '🎙️ Transcription terminée : {title}',
    transcriptionHeading: 'Transcription terminée',
    transcriptionGreeting: 'Bonjour {name},',
    transcriptionIntro: 'Votre transcription « {title} » est prête.',
    transcriptionButton: '📄 Voir la transcription',
    transcriptionNote: 'Consultez le texte intégral et lancez une analyse IA si besoin.',

    summarySubject: '📝 Résumé IA prêt : {title}',
    summaryHeading: 'Résumé IA prêt',
    summaryGreeting: 'Bonjour {name},',
    summaryIntro: 'Le résumé IA de « {title} » est prêt.',
    summaryExcerptTitle: 'Extrait :',
    summaryButton: '📝 Lire le résumé complet',
    summaryNote: 'Le résumé complet est disponible dans votre projet.',
  },

  en: {
    tagline: 'Collaborative research platform',
    footerNote: 'This email was sent automatically by Ebeno Research Platform.',
    managePreferences: 'Manage my email preferences',

    verificationSubject: '✉️ Verify your email — Ebeno Research Platform',
    verificationHeading: 'Email verification',
    verificationGreeting: 'Welcome {name}! 👋',
    verificationIntro: 'Thanks for signing up to Ebeno Research Platform. To activate your account, confirm your email address:',
    verificationButton: '✉️ Verify my email',
    verificationValidFor: '⏱️ This link is valid for 24 hours.',

    resetSubject: '🔑 Password reset — Ebeno Research Platform',
    resetHeading: 'Password reset',
    resetGreeting: 'Hello {name},',
    resetIntro: 'Click below to reset your password:',
    resetButton: '🔑 Reset my password',
    resetWarning: '⚠️ If you did not request this, please ignore this message.',

    memberAddedSubject: '👥 New project: {project}',
    memberAddedHeading: 'New project',
    memberAddedGreeting: 'Hello {name},',
    memberAddedIntro: '{owner} added you to the project "{project}" on Ebeno Research Platform.',
    memberAddedButton: '📂 Open project',
    memberAddedNote: 'You can now collaborate on documents, memos, and transcriptions in this project.',

    transcriptionSubject: '🎙️ Transcription complete: {title}',
    transcriptionHeading: 'Transcription complete',
    transcriptionGreeting: 'Hello {name},',
    transcriptionIntro: 'Your transcription "{title}" is ready.',
    transcriptionButton: '📄 View transcription',
    transcriptionNote: 'Read the full text and launch an AI analysis if needed.',

    summarySubject: '📝 AI summary ready: {title}',
    summaryHeading: 'AI summary ready',
    summaryGreeting: 'Hello {name},',
    summaryIntro: 'The AI summary for "{title}" is ready.',
    summaryExcerptTitle: 'Excerpt:',
    summaryButton: '📝 Read full summary',
    summaryNote: 'The full summary is available in your project.',
  },

  es: {
    tagline: 'Plataforma de investigación colaborativa',
    footerNote: 'Este correo fue enviado automáticamente por Ebeno Research Platform.',
    managePreferences: 'Gestionar mis preferencias de correo',

    verificationSubject: '✉️ Verifique su email — Ebeno Research Platform',
    verificationHeading: 'Verificación de email',
    verificationGreeting: '¡Bienvenido {name}! 👋',
    verificationIntro: 'Gracias por registrarse en Ebeno Research Platform. Para activar su cuenta, confirme su dirección de email:',
    verificationButton: '✉️ Verificar mi email',
    verificationValidFor: '⏱️ Este enlace es válido durante 24 horas.',

    resetSubject: '🔑 Restablecimiento de contraseña — Ebeno Research Platform',
    resetHeading: 'Restablecimiento de contraseña',
    resetGreeting: 'Hola {name},',
    resetIntro: 'Haga clic a continuación para restablecer su contraseña:',
    resetButton: '🔑 Restablecer mi contraseña',
    resetWarning: '⚠️ Si no solicitó esto, ignore este mensaje.',

    memberAddedSubject: '👥 Nuevo proyecto: {project}',
    memberAddedHeading: 'Nuevo proyecto',
    memberAddedGreeting: 'Hola {name},',
    memberAddedIntro: '{owner} le ha añadido al proyecto «{project}» en Ebeno Research Platform.',
    memberAddedButton: '📂 Abrir el proyecto',
    memberAddedNote: 'Ahora puede colaborar en los documentos, memos y transcripciones de este proyecto.',

    transcriptionSubject: '🎙️ Transcripción completada: {title}',
    transcriptionHeading: 'Transcripción completada',
    transcriptionGreeting: 'Hola {name},',
    transcriptionIntro: 'Su transcripción «{title}» está lista.',
    transcriptionButton: '📄 Ver la transcripción',
    transcriptionNote: 'Consulte el texto completo y lance un análisis de IA si es necesario.',

    summarySubject: '📝 Resumen IA listo: {title}',
    summaryHeading: 'Resumen IA listo',
    summaryGreeting: 'Hola {name},',
    summaryIntro: 'El resumen IA de «{title}» está listo.',
    summaryExcerptTitle: 'Extracto:',
    summaryButton: '📝 Leer el resumen completo',
    summaryNote: 'El resumen completo está disponible en su proyecto.',
  },

  pt: {
    tagline: 'Plataforma de investigação colaborativa',
    footerNote: 'Este email foi enviado automaticamente por Ebeno Research Platform.',
    managePreferences: 'Gerir as minhas preferências de email',

    verificationSubject: '✉️ Verifique o seu email — Ebeno Research Platform',
    verificationHeading: 'Verificação de email',
    verificationGreeting: 'Bem-vindo {name}! 👋',
    verificationIntro: 'Obrigado por se registar na Ebeno Research Platform. Para ativar a sua conta, confirme o seu endereço de email:',
    verificationButton: '✉️ Verificar o meu email',
    verificationValidFor: '⏱️ Este link é válido durante 24 horas.',

    resetSubject: '🔑 Redefinição de palavra-passe — Ebeno Research Platform',
    resetHeading: 'Redefinição de palavra-passe',
    resetGreeting: 'Olá {name},',
    resetIntro: 'Clique abaixo para redefinir a sua palavra-passe:',
    resetButton: '🔑 Redefinir a minha palavra-passe',
    resetWarning: '⚠️ Se não solicitou isto, ignore esta mensagem.',

    memberAddedSubject: '👥 Novo projeto: {project}',
    memberAddedHeading: 'Novo projeto',
    memberAddedGreeting: 'Olá {name},',
    memberAddedIntro: '{owner} adicionou-o ao projeto «{project}» na Ebeno Research Platform.',
    memberAddedButton: '📂 Abrir o projeto',
    memberAddedNote: 'Agora pode colaborar nos documentos, memos e transcrições deste projeto.',

    transcriptionSubject: '🎙️ Transcrição concluída: {title}',
    transcriptionHeading: 'Transcrição concluída',
    transcriptionGreeting: 'Olá {name},',
    transcriptionIntro: 'A sua transcrição «{title}» está pronta.',
    transcriptionButton: '📄 Ver a transcrição',
    transcriptionNote: 'Consulte o texto completo e lance uma análise de IA se necessário.',

    summarySubject: '📝 Resumo IA pronto: {title}',
    summaryHeading: 'Resumo IA pronto',
    summaryGreeting: 'Olá {name},',
    summaryIntro: 'O resumo IA de «{title}» está pronto.',
    summaryExcerptTitle: 'Excerto:',
    summaryButton: '📝 Ler o resumo completo',
    summaryNote: 'O resumo completo está disponível no seu projeto.',
  },

  ar: {
    tagline: 'منصة البحث التعاوني',
    footerNote: 'تم إرسال هذا البريد تلقائيًا من Ebeno Research Platform.',
    managePreferences: 'إدارة تفضيلات البريد الإلكتروني',

    verificationSubject: '✉️ تحقق من بريدك الإلكتروني — Ebeno Research Platform',
    verificationHeading: 'التحقق من البريد الإلكتروني',
    verificationGreeting: '!مرحبًا {name} 👋',
    verificationIntro: 'شكرًا لتسجيلك في Ebeno Research Platform. لتفعيل حسابك، يرجى تأكيد بريدك الإلكتروني:',
    verificationButton: '✉️ تأكيد بريدي الإلكتروني',
    verificationValidFor: '⏱️ هذا الرابط صالح لمدة 24 ساعة.',

    resetSubject: '🔑 إعادة تعيين كلمة المرور — Ebeno Research Platform',
    resetHeading: 'إعادة تعيين كلمة المرور',
    resetGreeting: '،{name} مرحبًا',
    resetIntro: 'انقر أدناه لإعادة تعيين كلمة المرور:',
    resetButton: '🔑 إعادة تعيين كلمة المرور',
    resetWarning: '⚠️ إذا لم تطلب هذا، يرجى تجاهل هذه الرسالة.',

    memberAddedSubject: '👥 مشروع جديد: {project}',
    memberAddedHeading: 'مشروع جديد',
    memberAddedGreeting: '،{name} مرحبًا',
    memberAddedIntro: 'أضافك {owner} إلى المشروع «{project}» على Ebeno Research Platform.',
    memberAddedButton: '📂 فتح المشروع',
    memberAddedNote: 'يمكنك الآن التعاون في المستندات والمذكرات والنسخ في هذا المشروع.',

    transcriptionSubject: '🎙️ اكتمل النسخ: {title}',
    transcriptionHeading: 'اكتمل النسخ',
    transcriptionGreeting: '،{name} مرحبًا',
    transcriptionIntro: 'نسختك «{title}» جاهزة.',
    transcriptionButton: '📄 عرض النسخة',
    transcriptionNote: 'اطلع على النص الكامل وابدأ تحليل الذكاء الاصطناعي إذا لزم الأمر.',

    summarySubject: '📝 ملخص الذكاء الاصطناعي جاهز: {title}',
    summaryHeading: 'ملخص الذكاء الاصطناعي جاهز',
    summaryGreeting: '،{name} مرحبًا',
    summaryIntro: 'ملخص الذكاء الاصطناعي لـ «{title}» جاهز.',
    summaryExcerptTitle: ':مقتطف',
    summaryButton: '📝 قراءة الملخص الكامل',
    summaryNote: 'الملخص الكامل متاح في مشروعك.',
  },
};
