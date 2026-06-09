import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboard } from '../../services/api.js';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetchDashboard();
        setDashboard(response.data);
      } catch (err) {
        setError('Unable to load your dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-100 px-4 py-8">Loading dashboard...</div>;
  }

  if (error && !dashboard) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-lg">
          <p className="text-rose-600">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 rounded-2xl bg-brand-600 px-5 py-3 text-white"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const data = dashboard || {};

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Teacher Dashboard</h1>
              <p className="mt-2 text-slate-600">Manage quizzes, polls, live sessions, and analytics from one place.</p>
            </div>
            <button
              onClick={() => navigate('/create')}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Create New Quiz
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Published Quizzes</p>
            <p className="mt-4 text-4xl font-semibold text-slate-900">{data.totalQuizzes || 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Active Sessions</p>
            <p className="mt-4 text-4xl font-semibold text-slate-900">{data.activeSessions || 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Total Participants</p>
            <p className="mt-4 text-4xl font-semibold text-slate-900">{data.totalParticipants || 0}</p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <button
              onClick={() => navigate('/create')}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left transition hover:border-brand-400"
            >
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Create Quiz</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">Build a new quiz or poll</p>
            </button>
            <button
              onClick={() => document.getElementById('recent-sessions')?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left transition hover:border-brand-400"
            >
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Live Sessions</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">Monitor current sessions</p>
            </button>
            <button
              onClick={() => document.getElementById('recent-sessions')?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left transition hover:border-brand-400"
            >
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Analytics</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">Review student performance</p>
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h2 className="text-xl font-semibold text-slate-900">Recent Quizzes</h2>
            <div className="mt-6 space-y-4">
              {data.recent?.length ? (
                data.recent.map((quiz) => (
                  <div key={quiz.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{quiz.title}</p>
                        <p className="text-sm text-slate-500">{quiz.mode} • {quiz.published ? 'Published' : 'Draft'}</p>
                      </div>
                      {quiz.published && quiz.sessionId && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/teacher/live/${quiz.sessionId}`)}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Control
                          </button>
                          <button
                            onClick={() => navigate(`/analytics/${quiz.sessionId}`)}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Analytics
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No quizzes created yet. Start by creating a quiz.</p>
              )}
            </div>
          </div>

          <div id="recent-sessions" className="rounded-3xl bg-white p-8 shadow-lg">
            <h2 className="text-xl font-semibold text-slate-900">Recent Sessions</h2>
            <div className="mt-6 space-y-4">
              {data.recentSessions?.length ? (
                data.recentSessions.map((session) => (
                  <div key={session.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{session.title}</p>
                        <p className="text-sm text-slate-500">
                          Code: {session.joinCode} • Status: <span className="capitalize font-semibold">{session.status}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {session.status !== 'finished' ? (
                          <button
                            onClick={() => navigate(`/teacher/live/${session.id}`)}
                            className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                          >
                            Control
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/analytics/${session.id}`)}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Analytics
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No sessions run yet. Publish a quiz to start a session.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
