// components/layout/Navbar.tsx
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../common/LanguageSelector';
import Dropdown, { DropdownItem } from '../common/Dropdown';

const Navbar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

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
        <Dropdown 
          trigger={
            <span className="text-gray-300 hover:text-white cursor-pointer">
              {t('navbar.profile')}
            </span>
          }
        >
          <DropdownItem to="/profile">{t('navbar.profile')}</DropdownItem>
          <DropdownItem to="/settings">{t('navbar.settings')}</DropdownItem>
          <DropdownItem to="#" onClick={handleLogout}>{t('navbar.logout')}</DropdownItem>
        </Dropdown>
      </div>
    </nav>
  );
};

export default Navbar;
