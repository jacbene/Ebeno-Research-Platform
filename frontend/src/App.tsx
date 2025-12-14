import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TranscriptionPage from './pages/TranscriptionPage';
import LoginPage from './pages/auth/Login';
import RegisterPage from './pages/auth/Register';
import DashboardPage from './pages/Dashboard';
import ChatPage from './pages/ChatPage'; // Nouvelle page pour le chat
import PrivateRoute from './components/PrivateRoute';
import SettingsPage from './pages/SettingsPage';
import MemoPage from './pages/MemoPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Routes protégées */}
        <Route path="/" element={<PrivateRoute />}>
          <Route index element={<DashboardPage />} />
          <Route path="/transcription" element={<TranscriptionPage />} />
          <Route path="/chat" element={<ChatPage />} /> {/* Nouvelle route */}
          <Route path="/chat/:conversationId" element={<ChatPage />} /> {/* Pour les conversations spécifiques */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/memos/:memoId" element={<MemoPage />} />
        </Route>
        
        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
