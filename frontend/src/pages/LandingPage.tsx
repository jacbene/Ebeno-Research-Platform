// frontend/src/pages/LandingPage.tsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage() {
  const { t } = useTranslation();
  const { effectiveMode, setMode } = useTheme();

  const toggleTheme = () => {
    setMode(effectiveMode === 'dark' ? 'light' : 'dark');
  };

  const features = [
    {
      icon: '🎙️',
      title: t('landing.feature1Title', 'Transcription Audio Souveraine'),
      desc: t('landing.feature1Desc', 'Uploadez vos entretiens. L\'IA transcrit avec précision via Whisper (Local ou Cloud) et détecte la langue automatiquement.'),
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    },
    {
      icon: '🤖',
      title: t('landing.feature2Title', 'Chat IA & Analyse Contextuelle'),
      desc: t('landing.feature2Desc', 'Discutez avec vos documents. Propulsé par Ollama (Local) ou DeepSeek (Cloud), l\'IA cite ses sources et analyse vos projets en temps réel.'),
      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300',
    },
    {
      icon: '🌍',
      title: t('landing.feature3Title', 'Traduction de Documents'),
      desc: t('landing.feature3Desc', 'Traduisez vos notes en un clic. Support du Français, Anglais, Espagnol, Portugais et Arabe (RTL natif).'),
      color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300',
    },
    {
      icon: '📝',
      title: t('landing.feature4Title', 'Résumés Intelligents'),
      desc: t('landing.feature4Desc', 'Générez des synthèses structurées de vos longs rapports et extraits clés en quelques secondes.'),
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
    },
    {
      icon: '🏷️',
      title: t('landing.feature5Title', 'Extraction d\'Entités (NER)'),
      desc: t('landing.feature5Desc', 'L\'IA identifie automatiquement les personnes, lieux, organisations et dates pour cartographier vos données.'),
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
    },
    {
      icon: '⚡',
      title: t('landing.feature6Title', 'Webhooks & API Ouverte'),
      desc: t('landing.feature6Desc', 'Connectez Ebeno à Zapier, Make ou Slack. Automatisez vos flux de recherche.'),
      color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    {
      icon: '🏢',
      title: t('landing.feature7Title', 'Espace Organisation'),
      desc: t('landing.feature7Desc', 'Créez des espaces partagés pour votre labo ou université. Mutualisez les crédits IA et collaborez.'),
      color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
    },
    {
      icon: '🛡️',
      title: t('landing.feature8Title', 'Sécurité & RGPD'),
      desc: t('landing.feature8Desc', 'Données chiffrées, 2FA, et conformité RGPD. En mode self-hosted, aucune donnée ne quitte vos serveurs.'),
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* NAVBAR */}
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
            {/* Lien Documentation interne */}
            <Link to="/docs" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hidden sm:block">
              Documentation
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
          <div className="inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-full mb-6">
            ✨ {t('landing.badge', 'Nouveau : Analyse augmentée par IA locale')}
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
            {t('landing.heroTitle', "La recherche qualitative, simple et souveraine")}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
            {t('landing.heroSubtitle', 'Transcrivez, analysez et collaborez. Que vous soyez étudiant ou laboratoire, Ebeno s\'adapte à vos besoins.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg transition-colors text-lg shadow-lg shadow-blue-500/30"
            >
              {t('landing.ctaPrimary', 'Commencer gratuitement')} →
            </Link>
            <a
              href="#institutions"
              className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold py-4 px-8 rounded-lg transition-colors text-lg"
            >
              {t('landing.ctaInstitutions', 'Déploiement Institution')}
            </a>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            {t('landing.noCreditCard', 'Sans carte bancaire • 50 messages IA offerts • Prêt pour le mobile money')}
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              {t('landing.featuresTitle', 'Tout ce dont vous avez besoin pour vos recherches')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Ebeno combine l'IA de pointe avec des outils collaboratifs pour transformer votre façon de travailler.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-6 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION INSTITUTIONS (Self-hosted / Souveraineté) */}
      <section id="institutions" className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="bg-blue-900 dark:bg-blue-950 rounded-3xl p-8 md:p-12 text-white overflow-hidden relative">
            <div className="relative z-10 md:w-2/3">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Pour les Universités & Laboratoires</h2>
              <p className="text-blue-100 text-lg mb-8">
                Exigences RGPD strictes ? Données de recherche sensibles ? 
                Déployez Ebeno sur votre propre infrastructure (Self-Hosted) en quelques minutes avec Docker. 
                Aucune donnée ne quitte vos serveurs.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">✅ <span>100% Souverain (Ollama, Whisper Local, MinIO)</span></li>
                <li className="flex items-center gap-3">✅ <span>11 services conteneurisés prêts à l'emploi</span></li>
                <li className="flex items-center gap-3">✅ <span>Guide de déploiement DSI inclus</span></li>
              </ul>
              <Link to="/docs/deployment" className="inline-block bg-white text-blue-900 font-bold py-3 px-6 rounded-lg hover:bg-blue-50 transition-colors">
                Voir le guide de déploiement →
              </Link>
            </div>
            {/* Éléments décoratifs */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            {t('landing.benefitsTitle', 'Pourquoi les chercheurs choisissent Ebeno ?')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('landing.benefit1Title', 'Sécurité & RGPD')}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">{t('landing.benefit1Desc', 'Export, suppression de compte, 2FA, chiffrement des données : la confidentialité au cœur de notre architecture.')}</p>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('landing.benefit2Title', 'Prêt pour l\'International')}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">{t('landing.benefit2Desc', 'Une interface et des documents traduits en 5 langues, avec le support natif de l\'arabe (RTL).')}</p>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('landing.benefit3Title', 'Paiement flexible')}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">{t('landing.benefit3Desc', 'Crédits à l\'unité (PAYG) ou abonnement. Payez par carte ou par Mobile Money (MTN/Orange).')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6">
            {t('landing.finalCtaTitle', 'Prêt à transformer votre recherche ?')}
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            {t('landing.finalCtaSubtitle', 'Rejoignez les étudiants, chercheurs et institutions qui gagnent des heures sur leur analyse qualitative.')}
          </p>
          <Link to="/register" className="inline-block bg-white text-blue-700 font-bold py-4 px-10 rounded-lg transition-colors hover:bg-blue-50 text-lg shadow-xl hover:scale-105 transform duration-200">
            {t('landing.finalCta', 'Créer mon compte gratuit')} →
          </Link>
        </div>
      </section>

      {/* FOOTER (identique avec liens internes) */}
      <footer className="bg-gray-900 dark:bg-black text-gray-400 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm">
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            <Link to="/legal" className="hover:text-white">Mentions légales</Link>
            <Link to="/cookies" className="hover:text-white">Cookies</Link>
            <Link to="/privacy" className="hover:text-white">Confidentialité</Link>
            <Link to="/terms" className="hover:text-white">CGU</Link>
            <Link to="/docs" className="hover:text-white">Documentation</Link>
            <Link to="/contact" className="hover:text-white font-bold text-white">📧 Contact</Link>
          </div>
          <p>© {new Date().getFullYear()} Ebeno Research Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
