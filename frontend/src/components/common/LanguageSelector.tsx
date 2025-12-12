import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="relative">
      <select 
        onChange={(e) => changeLanguage(e.target.value)} 
        value={i18n.language}
        className="bg-gray-800 text-white p-2 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <option value="fr">Français</option>
        <option value="en">English</option>
        <option value="ar">العربية</option>
      </select>
    </div>
  );
};

export default LanguageSelector;
