import { useNavigate, useLocation } from 'react-router-dom';

export default function TeacherHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('quiz-app-token');
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div 
            className="text-xl font-bold text-slate-900 cursor-pointer" 
            onClick={() => navigate('/dashboard')}
          >
            Quiz<span className="text-brand-600">App</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => navigate('/dashboard')}
              className={`text-sm font-semibold transition ${
                location.pathname === '/dashboard' ? 'text-brand-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/create')}
              className={`text-sm font-semibold transition ${
                location.pathname === '/create' ? 'text-brand-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Quiz
            </button>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="text-sm font-semibold text-rose-600 hover:text-rose-700"
          >
            Logout
          </button>
          <button
            onClick={() => navigate('/create')}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            New Quiz
          </button>
        </div>
      </div>
    </header>
  );
}
