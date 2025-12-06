import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';

const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      setMessage('Votre mot de passe a été réinitialisé avec succès.');
      setTimeout(() => navigate('/login'), 2000); // Redirect to login after 2 seconds
    } catch (err) {
      setError('Le lien de réinitialisation est invalide ou a expiré.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Réinitialiser le mot de passe</h2>
      <p>Entrez votre nouveau mot de passe.</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="password">Nouveau mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="confirm-password">Confirmer le nouveau mot de passe</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        {message && <p style={{ color: 'green' }}>{message}</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
