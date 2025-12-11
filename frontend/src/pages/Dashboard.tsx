import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { 
  LogOut, 
  User, 
  FolderKanban, 
  FileAudio, 
  BarChart3,
  Users,
  Settings,
  Bell,
  Search,
  Plus,
  GraduationCap,
  MessageSquare,
  ArrowRight,
  Brain,
  Sparkles
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  // Statistiques du dashboard
  const stats = [
    { label: 'Projets actifs', value: '3', icon: FolderKanban, color: 'blue', change: '+1' },
    { label: 'Transcripts', value: '12', icon: FileAudio, color: 'green', change: '+3' },
    { label: 'Heures audio', value: '8.5', icon: BarChart3, color: 'purple', change: '+1.2' },
    { label: 'Collaborateurs', value: '5', icon: Users, color: 'orange', change: '+2' },
  ];

  // Projets récents
  const recentProjects = [
    { id: 1, title: 'Enquête terrain ethnographique', status: 'active', members: 3, lastUpdated: 'Il y a 2 jours' },
    { id: 2, title: 'Analyse discours politique', status: 'paused', members: 2, lastUpdated: 'Il y a 1 semaine' },
    { id: 3, title: 'Étude qualitative santé', status: 'active', members: 4, lastUpdated: 'Aujourd\'hui' },
  ];

  // Fonction pour obtenir les classes de couleur
  const getColorClasses = (color: string) => {
    switch(color) {
      case 'blue':
        return { bg: 'bg-blue-100', text: 'text-blue-600', bgCard: 'bg-blue-50', border: 'border-blue-200' };
      case 'green':
        return { bg: 'bg-green-100', text: 'text-green-600', bgCard: 'bg-green-50', border: 'border-green-200' };
      case 'purple':
        return { bg: 'bg-purple-100', text: 'text-purple-600', bgCard: 'bg-purple-50', border: 'border-purple-200' };
      case 'orange':
        return { bg: 'bg-orange-100', text: 'text-orange-600', bgCard: 'bg-orange-50', border: 'border-orange-200' };
      default:
        return { bg: 'bg-blue-100', text: 'text-blue-600', bgCard: 'bg-blue-50', border: 'border-blue-200' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo et recherche */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">Ebeno Research</span>
              </div>

              <div className="hidden md:block w-96">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="search"
                    placeholder="Rechercher des projets, transcripts..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions utilisateur */}
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="relative group">
                <button className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-medium">
                    {user.profile.firstName[0]}{user.profile.lastName[0]}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user.profile.firstName} {user.profile.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{user.profile.discipline}</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête avec actions */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Bonjour, {user.profile.firstName} 👋
            </h1>
            <p className="text-gray-600 mt-2">
              Voici un aperçu de votre activité de recherche
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button className="btn btn-secondary">
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </button>
            <button
              onClick={handleLogout}
              className="btn btn-outline"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </button>
          </div>
        </div>

        {/* Section IA Assistant - Ajoutée ici */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center space-x-6 mb-6 md:mb-0">
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Brain className="h-12 w-12" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Assistant IA DeepSeek</h2>
                    <p className="text-blue-100 max-w-2xl">
                      Discutez avec notre IA spécialisée en recherche scientifique. 
                      Analyse de données, résumés, suggestions méthodologiques et plus encore.
                    </p>
                  </div>
                </div>
                <Link 
                  to="/chat" 
                  className="flex items-center space-x-3 bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <Sparkles className="h-5 w-5" />
                  <span>Essayer l'assistant</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const colors = getColorClasses(stat.color);
            
            return (
              <div key={index} className={`bg-white rounded-xl border ${colors.border} shadow-sm hover:shadow-md transition-shadow duration-200 ${colors.bgCard}`}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${colors.bg}`}>
                      <Icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      {stat.change}
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projets récents */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Projets récents</h3>
                <button className="btn btn-primary btn-sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nouveau projet
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentProjects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                          <FolderKanban className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{project.title}</h4>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              project.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {project.status === 'active' ? 'Actif' : 'En pause'}
                            </span>
                            <span className="text-xs text-gray-500">{project.members} membres</span>
                            <span className="text-xs text-gray-500">{project.lastUpdated}</span>
                          </div>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Voir tous les projets →
                </a>
              </div>
            </div>
          </div>

          {/* Colonne de droite */}
          <div className="space-y-6">
            {/* Profil utilisateur */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Votre profil</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {user.profile.firstName[0]}{user.profile.lastName[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">
                      {user.profile.firstName} {user.profile.lastName}
                    </h4>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Discipline</p>
                    <p className="font-medium">{user.profile.discipline}</p>
                  </div>
                  {user.profile.affiliation && (
                    <div>
                      <p className="text-sm text-gray-600">Affiliation</p>
                      <p className="font-medium">{user.profile.affiliation}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Statut</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Chercheur actif
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                <button className="btn btn-outline w-full">
                  <User className="h-4 w-4 mr-2" />
                  Modifier le profil
                </button>
              </div>
            </div>

            {/* Carte IA - Version compacte */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Assistant IA</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Obtenez des analyses approfondies de vos recherches en temps réel
                </p>
                <Link 
                  to="/chat" 
                  className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2.5 rounded-lg font-medium transition-all duration-200"
                >
                  <Brain className="h-4 w-4" />
                  <span>Ouvrir l'assistant</span>
                </Link>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Actions rapides</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileAudio className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="font-medium">Nouvelle transcription</span>
                    </div>
                    <Plus className="h-4 w-4 text-gray-400" />
                  </button>

                  <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <span className="font-medium">Inviter un collaborateur</span>
                    </div>
                    <Plus className="h-4 w-4 text-gray-400" />
                  </button>

                  <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                      </div>
                      <span className="font-medium">Exporter des données</span>
                    </div>
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
