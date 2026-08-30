import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    discipline: '',
    affiliation: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Envoyer les données au backend
      await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`,
        discipline: formData.discipline,
        affiliation: formData.affiliation
      });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: 'white',
        padding: '32px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a1a2e' }}>
            Créer un compte Ebeno
          </h2>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
            Ou{' '}
            <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none' }}>
              connectez-vous à votre compte existant
            </Link>
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Prénom
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                placeholder="Votre prénom"
                value={formData.firstName}
                onChange={handleChange}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Nom
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                placeholder="Votre nom"
                value={formData.lastName}
                onChange={handleChange}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="votre@email.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Minimum 8 caractères"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              Discipline
            </label>
            <select
              id="discipline"
              name="discipline"
              required
              value={formData.discipline}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="">Sélectionnez votre discipline</option>
              <option value="Anthropologie">Anthropologie</option>
              <option value="Sociologie">Sociologie</option>
              <option value="Science politique">Science politique</option>
              <option value="Histoire">Histoire</option>
              <option value="Psychologie">Psychologie</option>
              <option value="Économie">Économie</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              Affiliation (optionnel)
            </label>
            <input
              id="affiliation"
              name="affiliation"
              type="text"
              placeholder="Université, laboratoire..."
              value={formData.affiliation}
              onChange={handleChange}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
              En vous inscrivant, vous acceptez nos{' '}
              <Link to="/terms" style={{ color: '#2563eb', textDecoration: 'none' }}>
                conditions d'utilisation
              </Link>{' '}
              et notre{' '}
              <Link to="/privacy" style={{ color: '#2563eb', textDecoration: 'none' }}>
                politique de confidentialité
              </Link>
              .
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '10px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1
            }}
          >
            {isLoading ? 'Création du compte...' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
