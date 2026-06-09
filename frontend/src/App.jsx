import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Auth/LoginPage.jsx';
import RegisterPage from './pages/Auth/RegisterPage.jsx';
import DashboardPage from './pages/Teacher/DashboardPage.jsx';
import CreateQuizPage from './pages/Teacher/CreateQuizPage.jsx';
import LiveSessionPage from './pages/Teacher/LiveSessionPage.jsx';
import AnalyticsPage from './pages/Teacher/AnalyticsPage.jsx';
import JoinPage from './pages/Participant/JoinPage.jsx';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/create" element={<CreateQuizPage />} />
        <Route path="/teacher/live/:sessionId" element={<LiveSessionPage />} />
        <Route path="/analytics/:sessionId" element={<AnalyticsPage />} />
        <Route path="/join/:joinCode" element={<JoinPage />} />
      </Routes>
    </div>
  );
}

export default App;
