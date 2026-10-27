import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage() {
  const { t } = useTranslation();
  const { effectiveMode, setMode } = useTheme();

  const toggleTheme = () => {
    setMode(effectiveMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* NAVBAR MINIMALISTE */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <span className="font-bold text-lg text-gray-900 dark:text-white">Ebeno</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-xl p-2" title="Changer de thème">
              {effectiveMode === 'dark' ? '☀️' : '🌙'}
            </button>
            <Link to="/pricing" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hidden sm:block">
              {t('nav.pricing', 'Tarifs')}
            </Link>
            <Link to="/login" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              {t('auth.login.submit', 'Se connecter')}
            </Link>
            <Link
              to="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {t('auth.register.submit', "S'inscrire")}
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
            Ebeno Research Platform
          </h1>
          
          <div className="inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-full mb-6">
            ✨ {t('landing.badge', 'Nouveau : Analyse augmentée par IA')}
          </div>
          <h2 className="text-4xl sm:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
            {t('landing.heroTitle', "L'analyse qualitative augmentée par l'IA pour les chercheurs")}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
            {t('landing.heroSubtitle', 'Transcrivez, analysez et collaborez sur vos données de recherche dans un espace unique et sécurisé.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg transition-colors text-lg"
            >
              {t('landing.ctaPrimary', 'Commencer gratuitement')} →
            </Link>
            <Link
              to="/pricing"
              className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold py-4 px-8 rounded-lg transition-colors text-lg"
            >
              {t('landing.ctaSecondary', 'Voir les tarifs')}
            </Link>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            {t('landing.noCreditCard', 'Sans carte bancaire • 50 messages IA offerts')}
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            {t('landing.featuresTitle', 'Tout ce dont vous avez besoin pour votre recherche')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-4xl mb-4">🎙️</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t('landing.feature1Title', 'Transcription IA')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t('landing.feature1Desc', 'Transcrivez automatiquement vos entretiens audio avec une précision professionnelle.')}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t('landing.feature2Title', 'Chat contextuel')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t('landing.feature2Desc', 'Posez des questions à vos documents. L\'IA répond en citant ses sources.')}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t('landing.feature3Title', 'Collaboration temps réel')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t('landing.feature3Desc', 'Invitez vos collègues à co-éditer vos analyses et documents.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            {t('landing.benefitsTitle', 'Pourquoi les chercheurs choisissent Ebeno ?')}
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="text-2xl">🔒</div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">{t('landing.benefit1Title', 'Conforme RGPD')}</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{t('landing.benefit1Desc', 'Export, suppression de compte, chiffrement : la confidentialité au cœur.')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-2xl">🌍</div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">{t('landing.benefit2Title', 'Multilingue')}</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{t('landing.benefit2Desc', 'Français, anglais, espagnol, portugais, arabe — avec support RTL natif.')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-2xl">💳</div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">{t('landing.benefit3Title', 'Paiement flexible')}</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{t('landing.benefit3Desc', 'Abonnement Pro, Institution, ou crédits à l\'unité. Sans engagement.')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 px-4 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">
            {t('landing.finalCtaTitle', 'Prêt à transformer votre recherche ?')}
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            {t('landing.finalCtaSubtitle', 'Rejoignez les chercheurs qui gagnent des heures sur leur analyse qualitative.')}
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-blue-700 font-bold py-4 px-10 rounded-lg transition-colors hover:bg-blue-50 text-lg"
          >
            {t('landing.finalCta', 'Créer mon compte gratuit')} →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 dark:bg-black text-gray-400 py-8 px-4 border-t border-transparent dark:border-gray-800">
        <div className="max-w-6xl mx-auto text-center text-sm">
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            <Link to="/legal" className="hover:text-white">Mentions légales</Link>
            <Link to="/cookies" className="hover:text-white">Cookies</Link>
            <Link to="/privacy" className="hover:text-white">Confidentialité</Link>
            <Link to="/terms" className="hover:text-white">CGU</Link>
            <Link to="/refunds" className="hover:text-white">Remboursement</Link>
            <Link to="/contact" className="hover:text-white font-bold text-white">📧 Contact</Link>
          </div>
          <p>© {new Date().getFullYear()} Ebeno Research Platform</p>
        </div>
      </footer>
    </div>
  );
}
