import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { GraduationCap } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la connexion');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Sidebar avec branding */}
      <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 md:p-12 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <GraduationCap className="h-8 w-8" />
            <span className="text-2xl font-bold">Ebeno Research</span>
          </div>
          
          <div className="mt-12">
            <h1 className="text-4xl font-bold mb-4">
              Plateforme de recherche <br />en Sciences Humaines
            </h1>
            <p className="text-blue-100 text-lg">
              Outils collaboratifs pour chercheurs, transcriptions intelligentes, 
              analyse qualitative avancée.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center space-x-4 text-blue-200">
            <div className="flex-1 h-px bg-blue-500"></div>
            <span className="text-sm">Développé pour la recherche SHS</span>
            <div className="flex-1 h-px bg-blue-500"></div>
          </div>
        </div>
      </div>

      {/* Formulaire de connexion */}
      <div className="md:w-1/2 p-8 md:p-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Connexion
            </h2>
            <p className="text-gray-600">
              Accédez à votre espace de recherche
            </p>
          </div>

          {error && (
            <div className="alert alert-danger mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="form-input"
                placeholder="researcher@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Se souvenir de moi
                </label>
              </div>

              <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
                Mot de passe oublié ?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full py-3 text-base"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connexion en cours...
                </span>
              ) : 'Se connecter'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Pas encore de compte ?</span>
              </div>
            </div>

            <div className="text-center">
              <Link
                to="/register"
                className="btn btn-outline w-full py-3 text-base"
              >
                Créer un nouveau compte
              </Link>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              En vous connectant, vous acceptez nos{' '}
              <Link to="/terms" className="font-medium text-blue-600 hover:text-blue-500">
                conditions d'utilisation
              </Link>{' '}
              et notre{' '}
              <Link to="/privacy" className="font-medium text-blue-600 hover:text-blue-500">
                politique de confidentialité
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;