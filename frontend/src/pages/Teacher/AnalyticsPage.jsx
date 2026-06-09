import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchAnalytics } from '../../services/api.js';

export default function AnalyticsPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await fetchAnalytics(sessionId);
        setAnalytics(response.data);
      } catch (err) {
        setError('Unable to load analytics.');
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [sessionId]);

  if (loading) {
    return <div className="min-h-screen bg-slate-100 px-4 py-8">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-lg">
          <p className="text-rose-600">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 rounded-2xl bg-brand-600 px-5 py-3 text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-lg">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Session Analytics</h1>
            <p className="mt-2 text-slate-600">Review how students performed and which questions drove participation.</p>
          </div>
          <button
            onClick={() => navigate(`/teacher/live/${sessionId}`)}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Back to Live Session
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Total Respondents</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{analytics.participantsCount || 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Responses Submitted</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{analytics.responsesCount || 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Leaderboard Entries</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{analytics.leaderboard?.length || 0}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Top Performers</h2>
            <div className="mt-5 space-y-3">
              {analytics.leaderboard?.length ? (
                analytics.leaderboard.map((entry, index) => (
                  <div key={index} className="rounded-3xl bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-slate-900">{entry.name}</p>
                      <p className="text-sm text-slate-500">{entry.score} pts</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No responses yet. Wait for students to submit answers.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Recent Responses</h2>
            <div className="mt-5 space-y-3">
              {analytics.responses?.length ? (
                analytics.responses.slice(-6).reverse().map((response, index) => (
                  <div key={index} className="rounded-3xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-700">Question {response.questionIndex + 1}</p>
                    <p className="mt-1 text-sm text-slate-500">Participant: {response.participantId}</p>
                    <p className="mt-1 text-sm text-slate-500">Correct: {response.isCorrect ? 'Yes' : 'No'}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No answers recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
