// components/layout/Navbar.tsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../common/LanguageSelector';

const Navbar = () => {
  const { t } = useTranslation();

  return (
    <nav className="bg-gray-900 shadow-md p-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <Link to="/dashboard" className="text-white text-lg font-bold">Ebeno</Link>
        {/* Liens de navigation principaux */}
        <Link to="/dashboard" className="text-gray-300 hover:text-white">{t('navbar.dashboard')}</Link>
        <Link to="/projects" className="text-gray-300 hover:text-white">{t('navbar.projects')}</Link>
        <Link to="/transcriptions" className="text-gray-300 hover:text-white">{t('navbar.transcriptions')}</Link>
        <Link to="/documents" className="text-gray-300 hover:text-white">{t('navbar.documents')}</Link>
      </div>
      <div className="flex items-center space-x-4">
        <LanguageSelector />
        <Link to="/profile" className="text-gray-300 hover:text-white">{t('navbar.profile')}</Link>
      </div>
    </nav>
  );
};

export default Navbar;
