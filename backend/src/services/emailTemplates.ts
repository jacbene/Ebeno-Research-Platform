// backend/src/services/emailTemplates.ts
export type Lang = 'fr' | 'en' | 'es' | 'pt' | 'ar';

export interface EmailStrings {
  tagline: string;
  footerNote: string;
  managePreferences: string;
  verificationSubject: string;
  verificationHeading: string;
  verificationGreeting: string;
  verificationIntro: string;
  verificationButton: string;
  verificationValidFor: string;
  resetSubject: string;
  resetHeading: string;
  resetGreeting: string;
  resetIntro: string;
  resetButton: string;
  resetWarning: string;
  memberAddedSubject: string;
  memberAddedHeading: string;
  memberAddedGreeting: string;
  memberAddedIntro: string;
  memberAddedButton: string;
  memberAddedNote: string;
  transcriptionSubject: string;
  transcriptionHeading: string;
  transcriptionGreeting: string;
  transcriptionIntro: string;
  transcriptionButton: string;
  transcriptionNote: string;
  summarySubject: string;
  summaryHeading: string;
  summaryGreeting: string;
  summaryIntro: string;
  summaryExcerptTitle: string;
  summaryButton: string;
  summaryNote: string;
  deletionSubject: string;
  deletionHeading: string;
  deletionGreeting: string;
  deletionIntro: string;
  deletionDateLine: string;
  deletionWarning: string;
  deletionCancelButton: string;
  deletionConfirmText: string;
  emailSpamWarning: string;
  emailSpamWarningLogin: string;
  
  welcomeSubject: string;
  welcomeGreeting: string;
  welcomeIntro: string;
  welcomeButton: string;
  welcomeNote: string;
  subConfirmSubject: string;
  subConfirmGreeting: string;
  subConfirmIntro: string;
  subConfirmButton: string;
  subConfirmNote: string;
}

export const EMAIL_STRINGS: Record<Lang, EmailStrings> = {
  fr: {
    tagline: 'Plateforme de recherche collaborative',
    footerNote: 'Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.',
    managePreferences: 'Gérer mes préférences',
    verificationSubject: 'Activez votre compte Ebeno Research Platform',
    verificationHeading: 'Bienvenue sur Ebeno !',
    verificationGreeting: 'Bonjour {name},',
    verificationIntro: 'Merci de vous être inscrit sur Ebeno Research Platform. Pour activer votre compte et commencer vos recherches, veuillez cliquer sur le bouton ci-dessous.',
    verificationButton: 'Activer mon compte',
    verificationValidFor: 'Ce lien est valide pendant 24 heures.',
    resetSubject: 'Réinitialisation de votre mot de passe',
    resetHeading: 'Réinitialisation du mot de passe',
    resetGreeting: 'Bonjour {name},',
    resetIntro: 'Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.',
    resetButton: 'Réinitialiser mon mot de passe',
    resetWarning: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    memberAddedSubject: 'Vous avez été ajouté au projet "{project}"',
    memberAddedHeading: 'Nouveau projet',
    memberAddedGreeting: 'Bonjour {name},',
    memberAddedIntro: '{owner} vous a ajouté au projet "{project}" sur Ebeno Research Platform.',
    memberAddedButton: 'Accéder au projet',
    memberAddedNote: "Vous recevez cet e-mail car vous êtes membre de ce projet.",
    transcriptionSubject: 'Votre transcription "{title}" est prête',
    transcriptionHeading: 'Transcription terminée',
    transcriptionGreeting: 'Bonjour {name},',
    transcriptionIntro: 'La transcription de votre fichier "{title}" est maintenant prête à être consultée.',
    transcriptionButton: 'Voir la transcription',
    transcriptionNote: 'Vous pouvez désactiver ces notifications depuis vos paramètres.',
    summarySubject: 'Votre résumé "{title}" est prêt',
    summaryHeading: 'Résumé disponible',
    summaryGreeting: 'Bonjour {name},',
    summaryIntro: 'Le résumé IA de votre document "{title}" a été généré avec succès.',
    summaryExcerptTitle: 'Aperçu du résumé :',
    summaryButton: 'Lire le résumé complet',
    summaryNote: 'Vous pouvez désactiver ces notifications depuis vos paramètres.',
    deletionSubject: 'Suppression de votre compte Ebeno',
    deletionHeading: 'Suppression programmée',
    deletionGreeting: 'Bonjour {name},',
    deletionIntro: 'Votre demande de suppression de compte a bien été prise en compte.',
    deletionDateLine: 'Votre compte sera définitivement supprimé le {date}.',
    deletionWarning: 'Si vous changez d\'avis, vous pouvez annuler cette suppression jusqu\'à cette date.',
    deletionCancelButton: 'Annuler la suppression',
    deletionConfirmText: 'Si vous ne souhaitez pas supprimer votre compte, cliquez sur le bouton ci-dessus.',
    emailSpamWarning: 'Pensez à vérifier vos spams si vous ne trouvez pas cet e-mail.',
    emailSpamWarningLogin: 'Pensez à vérifier vos spams.',
    welcomeSubject: "Bienvenue sur Ebeno Research Platform 🎓",
    welcomeGreeting: "Bonjour {name},",
    welcomeIntro: "Nous sommes ravis de vous accueillir sur Ebeno Research Platform, votre nouvel espace de recherche collaborative augmenté par l'IA.",
    welcomeButton: "Accéder à mon espace",
    welcomeNote: "Si vous avez des questions, n'hésitez pas à répondre à cet e-mail.",
    subConfirmSubject: "Votre abonnement Ebeno Pro est actif ! 🚀",
    subConfirmGreeting: "Bonjour {name},",
    subConfirmIntro: "Merci pour votre confiance. Votre abonnement au plan {plan} est maintenant actif.",
    subConfirmButton: "Voir mon tableau de bord",
    subConfirmNote: "Votre prochaine facturation aura lieu le {date}.",
  },
  en: {
    tagline: 'Collaborative research platform',
    footerNote: 'This email was sent automatically, please do not reply.',
    managePreferences: 'Manage preferences',
    verificationSubject: 'Activate your Ebeno Research Platform account',
    verificationHeading: 'Welcome to Ebeno!',
    verificationGreeting: 'Hello {name},',
    verificationIntro: 'Thank you for signing up for Ebeno Research Platform. To activate your account, please click the button below.',
    verificationButton: 'Activate my account',
    verificationValidFor: 'This link is valid for 24 hours.',
    resetSubject: 'Password reset',
    resetHeading: 'Reset your password',
    resetGreeting: 'Hello {name},',
    resetIntro: 'You requested a password reset. Click the button below to choose a new password.',
    resetButton: 'Reset my password',
    resetWarning: 'If you did not request this, please ignore this email.',
    memberAddedSubject: 'You were added to project "{project}"',
    memberAddedHeading: 'New project',
    memberAddedGreeting: 'Hello {name},',
    memberAddedIntro: '{owner} added you to the project "{project}" on Ebeno Research Platform.',
    memberAddedButton: 'Access project',
    memberAddedNote: 'You receive this email because you are a member of this project.',
    transcriptionSubject: 'Your transcription "{title}" is ready',
    transcriptionHeading: 'Transcription complete',
    transcriptionGreeting: 'Hello {name},',
    transcriptionIntro: 'The transcription of your file "{title}" is ready to view.',
    transcriptionButton: 'View transcription',
    transcriptionNote: 'You can disable these notifications in your settings.',
    summarySubject: 'Your summary "{title}" is ready',
    summaryHeading: 'Summary available',
    summaryGreeting: 'Hello {name},',
    summaryIntro: 'The AI summary of your document "{title}" was successfully generated.',
    summaryExcerptTitle: 'Summary excerpt:',
    summaryButton: 'Read full summary',
    summaryNote: 'You can disable these notifications in your settings.',
    deletionSubject: 'Ebeno account deletion',
    deletionHeading: 'Deletion scheduled',
    deletionGreeting: 'Hello {name},',
    deletionIntro: 'Your account deletion request has been received.',
    deletionDateLine: 'Your account will be permanently deleted on {date}.',
    deletionWarning: 'If you change your mind, you can cancel this deletion until then.',
    deletionCancelButton: 'Cancel deletion',
    deletionConfirmText: 'If you do not want to delete your account, click the button above.',
    emailSpamWarning: 'Please check your spam folder if you cannot find this email.',
    emailSpamWarningLogin: 'Please check your spam folder.',
    welcomeSubject: "Welcome to Ebeno Research Platform 🎓",
    welcomeGreeting: "Hello {name},",
    welcomeIntro: "We are delighted to welcome you to Ebeno Research Platform, your new AI-augmented collaborative research space.",
    welcomeButton: "Access my space",
    welcomeNote: "If you have any questions, feel free to reply to this email.",
    subConfirmSubject: "Your Ebeno Pro subscription is active! 🚀",
    subConfirmGreeting: "Hello {name},",
    subConfirmIntro: "Thank you for your trust. Your subscription to the {plan} plan is now active.",
    subConfirmButton: "View my dashboard",
    subConfirmNote: "Your next billing will occur on {date}.",
  },
  es: {
    tagline: 'Plataforma de investigación colaborativa',
    footerNote: 'Este correo fue enviado automáticamente, por favor no responda.',
    managePreferences: 'Gestionar preferencias',
    verificationSubject: 'Active su cuenta de Ebeno Research Platform',
    verificationHeading: '¡Bienvenido a Ebeno!',
    verificationGreeting: 'Hola {name},',
    verificationIntro: 'Gracias por registrarse en Ebeno Research Platform. Para activar su cuenta, haga clic en el botón de abajo.',
    verificationButton: 'Activar mi cuenta',
    verificationValidFor: 'Este enlace es válido por 24 horas.',
    resetSubject: 'Restablecimiento de contraseña',
    resetHeading: 'Restablecer su contraseña',
    resetGreeting: 'Hola {name},',
    resetIntro: 'Ha solicitado restablecer su contraseña. Haga clic en el botón de abajo para elegir una nueva.',
    resetButton: 'Restablecer contraseña',
    resetWarning: 'Si no solicitó esto, ignore este correo.',
    memberAddedSubject: 'Ha sido añadido al proyecto "{project}"',
    memberAddedHeading: 'Nuevo proyecto',
    memberAddedGreeting: 'Hola {name},',
    memberAddedIntro: '{owner} le añadió al proyecto "{project}" en Ebeno Research Platform.',
    memberAddedButton: 'Acceder al proyecto',
    memberAddedNote: 'Recibe este correo porque es miembro de este proyecto.',
    transcriptionSubject: 'Su transcripción "{title}" está lista',
    transcriptionHeading: 'Transcripción completa',
    transcriptionGreeting: 'Hola {name},',
    transcriptionIntro: 'La transcripción de su archivo "{title}" está lista para ver.',
    transcriptionButton: 'Ver transcripción',
    transcriptionNote: 'Puede desactivar estas notificaciones en su configuración.',
    summarySubject: 'Su resumen "{title}" está listo',
    summaryHeading: 'Resumen disponible',
    summaryGreeting: 'Hola {name},',
    summaryIntro: 'El resumen de IA de su documento "{title}" fue generado con éxito.',
    summaryExcerptTitle: 'Extracto del resumen:',
    summaryButton: 'Leer resumen completo',
    summaryNote: 'Puede desactivar estas notificaciones en su configuración.',
    deletionSubject: 'Eliminación de cuenta Ebeno',
    deletionHeading: 'Eliminación programada',
    deletionGreeting: 'Hola {name},',
    deletionIntro: 'Su solicitud de eliminación de cuenta ha sido recibida.',
    deletionDateLine: 'Su cuenta será eliminada permanentemente el {date}.',
    deletionWarning: 'Si cambia de opinión, puede cancelar esto hasta entonces.',
    deletionCancelButton: 'Cancelar eliminación',
    deletionConfirmText: 'Si no desea eliminar su cuenta, haga clic en el botón de arriba.',
    emailSpamWarning: 'Revise su carpeta de spam si no encuentra este correo.',
    emailSpamWarningLogin: 'Revise su carpeta de spam.',
    welcomeSubject: "¡Bienvenido a Ebeno Research Platform! 🎓",
    welcomeGreeting: "Hola {name},",
    welcomeIntro: "Estamos encantados de darte la bienvenida a Ebeno Research Platform, tu nuevo espacio de investigación colaborativa aumentado por IA.",
    welcomeButton: "Acceder a mi espacio",
    welcomeNote: "Si tienes alguna pregunta, no dudes en responder a este correo.",
    subConfirmSubject: "¡Tu suscripción a Ebeno Pro está activa! 🚀",
    subConfirmGreeting: "Hola {name},",
    subConfirmIntro: "Gracias por tu confianza. Tu suscripción al plan {plan} ahora está activa.",
    subConfirmButton: "Ver mi panel",
    subConfirmNote: "Tu próxima facturación será el {date}.",
  },
  pt: {
    tagline: 'Plataforma de pesquisa colaborativa',
    footerNote: 'Este e-mail foi enviado automaticamente, por favor não responda.',
    managePreferences: 'Gerenciar preferências',
    verificationSubject: 'Ative sua conta Ebeno Research Platform',
    verificationHeading: 'Bem-vindo ao Ebeno!',
    verificationGreeting: 'Olá {name},',
    verificationIntro: 'Obrigado por se inscrever no Ebeno Research Platform. Para ativar sua conta, clique no botão abaixo.',
    verificationButton: 'Ativar minha conta',
    verificationValidFor: 'Este link é válido por 24 horas.',
    resetSubject: 'Redefinição de senha',
    resetHeading: 'Redefinir sua senha',
    resetGreeting: 'Olá {name},',
    resetIntro: 'Você solicitou uma redefinição de senha. Clique no botão abaixo para escolher uma nova.',
    resetButton: 'Redefinir senha',
    resetWarning: 'Se você não solicitou isso, ignore este e-mail.',
    memberAddedSubject: 'Você foi adicionado ao projeto "{project}"',
    memberAddedHeading: 'Novo projeto',
    memberAddedGreeting: 'Olá {name},',
    memberAddedIntro: '{owner} adicionou você ao projeto "{project}" no Ebeno Research Platform.',
    memberAddedButton: 'Acessar projeto',
    memberAddedNote: 'Você recebe este e-mail porque é membro deste projeto.',
    transcriptionSubject: 'Sua transcrição "{title}" está pronta',
    transcriptionHeading: 'Transcrição concluída',
    transcriptionGreeting: 'Olá {name},',
    transcriptionIntro: 'A transcrição do seu arquivo "{title}" está pronta para visualização.',
    transcriptionButton: 'Ver transcrição',
    transcriptionNote: 'Você pode desativar essas notificações nas suas configurações.',
    summarySubject: 'Seu resumo "{title}" está pronto',
    summaryHeading: 'Resumo disponível',
    summaryGreeting: 'Olá {name},',
    summaryIntro: 'O resumo de IA do seu documento "{title}" foi gerado com sucesso.',
    summaryExcerptTitle: 'Trecho do resumo:',
    summaryButton: 'Ler resumo completo',
    summaryNote: 'Você pode desativar essas notificações nas suas configurações.',
    deletionSubject: 'Exclusão de conta Ebeno',
    deletionHeading: 'Exclusão agendada',
    deletionGreeting: 'Olá {name},',
    deletionIntro: 'Sua solicitação de exclusão de conta foi recebida.',
    deletionDateLine: 'Sua conta será permanentemente excluída em {date}.',
    deletionWarning: 'Se você mudar de ideia, pode cancelar isso até lá.',
    deletionCancelButton: 'Cancelar exclusão',
    deletionConfirmText: 'Se você não deseja excluir sua conta, clique no botão acima.',
    emailSpamWarning: 'Verifique sua pasta de spam se não encontrar este e-mail.',
    emailSpamWarningLogin: 'Verifique sua pasta de spam.',
    welcomeSubject: "Bem-vindo ao Ebeno Research Platform 🎓",
    welcomeGreeting: "Olá {name},",
    welcomeIntro: "Temos o prazer de recebê-lo no Ebeno Research Platform, seu novo espaço de pesquisa colaborativa aumentado por IA.",
    welcomeButton: "Acessar meu espaço",
    welcomeNote: "Se você tiver alguma dúvida, sinta-se à vontade para responder a este e-mail.",
    subConfirmSubject: "Sua assinatura Ebeno Pro está ativa! 🚀",
    subConfirmGreeting: "Olá {name},",
    subConfirmIntro: "Obrigado pela sua confiança. Sua assinatura do plano {plan} agora está ativa.",
    subConfirmButton: "Ver meu painel",
    subConfirmNote: "Sua próxima cobrança será em {date}.",
  },
  ar: {
    tagline: 'منصة البحث التعاوني',
    footerNote: 'تم إرسال هذا البريد الإلكتروني تلقائيًا، يرجى عدم الرد عليه.',
    managePreferences: 'إدارة التفضيلات',
    verificationSubject: 'تنشيط حسابك في Ebeno Research Platform',
    verificationHeading: 'مرحبًا بك في Ebeno!',
    verificationGreeting: 'مرحبًا {name}،',
    verificationIntro: 'شكرًا لتسجيلك في Ebeno Research Platform. لتنشيط حسابك، يرجى النقر على الزر أدناه.',
    verificationButton: 'تنشيط حسابي',
    verificationValidFor: 'هذا الرابط صالح لمدة 24 ساعة.',
    resetSubject: 'إعادة تعيين كلمة المرور',
    resetHeading: 'إعادة تعيين كلمة المرور',
    resetGreeting: 'مرحبًا {name}،',
    resetIntro: 'لقد طلبت إعادة تعيين كلمة المرور. انقر على الزر أدناه لاختيار كلمة مرور جديدة.',
    resetButton: 'إعادة تعيين كلمة المرور',
    resetWarning: 'إذا لم تطلب ذلك، يرجى تجاهل هذا البريد الإلكتروني.',
    memberAddedSubject: 'تمت إضافتك إلى مشروع "{project}"',
    memberAddedHeading: 'مشروع جديد',
    memberAddedGreeting: 'مرحبًا {name}،',
    memberAddedIntro: 'أضافك {owner} إلى مشروع "{project}" على Ebeno Research Platform.',
    memberAddedButton: 'الوصول إلى المشروع',
    memberAddedNote: 'تتلقى هذا البريد الإلكتروني لأنك عضو في هذا المشروع.',
    transcriptionSubject: 'نسخك الصوتي "{title}" جاهز',
    transcriptionHeading: 'اكتمل النسخ',
    transcriptionGreeting: 'مرحبًا {name}،',
    transcriptionIntro: 'النسخ الصوتي لملفك "{title}" جاهز للعرض.',
    transcriptionButton: 'عرض النسخ',
    transcriptionNote: 'يمكنك تعطيل هذه الإشعارات من إعداداتك.',
    summarySubject: 'ملخصك "{title}" جاهز',
    summaryHeading: 'الملخص متاح',
    summaryGreeting: 'مرحبًا {name}،',
    summaryIntro: 'تم إنشاء ملخص الذكاء الاصطناعي لمستندك "{title}" بنجاح.',
    summaryExcerptTitle: 'مقتطف من الملخص:',
    summaryButton: 'قراءة الملخص الكامل',
    summaryNote: 'يمكنك تعطيل هذه الإشعارات من إعداداتك.',
    deletionSubject: 'حذف حساب Ebeno',
    deletionHeading: 'تم جدولة الحذف',
    deletionGreeting: 'مرحبًا {name}،',
    deletionIntro: 'تم استلام طلب حذف حسابك.',
    deletionDateLine: 'سيتم حذف حسابك نهائيًا في {date}.',
    deletionWarning: 'إذا غيرت رأيك، يمكنك إلغاء هذا حتى ذلك الحين.',
    deletionCancelButton: 'إلغاء الحذف',
    deletionConfirmText: 'إذا كنت لا ترغب في حذف حسابك، انقر على الزر أعلاه.',
    emailSpamWarning: 'يرجى التحقق من مجلد البريد العشوائي إذا لم تجد هذا البريد الإلكتروني.',
    emailSpamWarningLogin: 'يرجى التحقق من مجلد البريد العشوائي.',
    welcomeSubject: "مرحبًا بك في Ebeno Research Platform 🎓",
    welcomeGreeting: "مرحبًا {name}،",
    welcomeIntro: "يسعدنا الترحيب بك في Ebeno Research Platform، مساحة البحث التعاوني الجديدة المعززة بالذكاء الاصطناعي.",
    welcomeButton: "الوصول إلى مساحتي",
    welcomeNote: "إذا كانت لديك أي أسئلة، فلا تتردد في الرد على هذا البريد الإلكتروني.",
    subConfirmSubject: "اشتراكك في Ebeno Pro نشط الآن! 🚀",
    subConfirmGreeting: "مرحبًا {name}،",
    subConfirmIntro: "شكرًا لثقتك. اشتراكك في خطة {plan} نشط الآن.",
    subConfirmButton: "عرض لوحة التحكم",
    subConfirmNote: "ستتم فاتورتك التالية في {date}.",
  },
};

export function normalizeLang(lang?: string): Lang {
  if (!lang) return 'fr';
  const l = lang.toLowerCase().slice(0, 2);
  if (l === 'en' || l === 'es' || l === 'pt' || l === 'ar' || l === 'fr') {
    return l as Lang;
  }
  return 'fr';
}

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}
