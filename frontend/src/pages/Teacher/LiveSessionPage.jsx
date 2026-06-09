import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socket from '../../services/socket.js';
import { controlSession, fetchSession, fetchAnalytics } from '../../services/api.js';

export default function LiveSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchSession(sessionId);
        setSession({ ...response.data.session, quiz: response.data.quiz });
        const analyticsResponse = await fetchAnalytics(sessionId);
        setAnalytics(analyticsResponse.data);
      } catch (err) {
        setError('Unable to load live session details.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    socket.emit('subscribe-teacher', { sessionId });

    const refreshSession = async () => {
      try {
        const response = await fetchSession(sessionId);
        setSession({ ...response.data.session, quiz: response.data.quiz });
      } catch (_) {}
    };

    socket.on('session:participant-joined', () => refreshSession());
    socket.on('session:answer-submitted', () => refreshSession());
    socket.on('session:control', () => refreshSession());

    return () => {
      socket.off('session:participant-joined');
      socket.off('session:answer-submitted');
      socket.off('session:control');
    };
  }, [sessionId]);

  const handleControl = async (action) => {
    setError('');
    try {
      await controlSession(sessionId, action);
      const response = await fetchSession(sessionId);
      setSession({ ...response.data.session, quiz: response.data.quiz });
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update session.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-100 px-4 py-8">Loading session...</div>;
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

  const currentQuestion = session?.quiz?.questions?.[session.currentQuestionIndex] || null;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Live Session</h1>
            <p className="mt-2 text-slate-600">Control your active session and track participation in real time.</p>
          </div>
          <button
            onClick={() => navigate(`/analytics/${sessionId}`)}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            View Analytics
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Status</p>
            <p className="mt-4 text-2xl font-semibold text-slate-900">{session.status || 'draft'}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Participants</p>
            <p className="mt-4 text-2xl font-semibold text-slate-900">{session.participantsCount || 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Session Code</p>
            <p className="mt-4 text-2xl font-semibold text-slate-900">{session.joinCode}</p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Current Question</h2>
              <p className="mt-1 text-sm text-slate-500">Question {session.currentQuestionIndex + 1} of {session.quiz.questions.length}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {session.status === 'waiting' && (
                <button
                  onClick={() => handleControl('start')}
                  className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Start Session
                </button>
              )}
              {session.status === 'live' && (
                <>
                  <button
                    onClick={() => handleControl('pause')}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => handleControl('prev')}
                    disabled={session.currentQuestionIndex === 0}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous Question
                  </button>
                  <button
                    onClick={() => handleControl('next')}
                    disabled={session.currentQuestionIndex === session.quiz.questions.length - 1}
                    className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Next Question
                  </button>
                  <button
                    onClick={() => handleControl('end')}
                    className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    End Session
                  </button>
                </>
              )}
              {session.status === 'paused' && (
                <>
                  <button
                    onClick={() => handleControl('resume')}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => handleControl('end')}
                    className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    End Session
                  </button>
                </>
              )}
            </div>
          </div>

          {currentQuestion ? (
            <div className="space-y-4">
              <p className="text-lg font-semibold text-slate-900">{currentQuestion.text}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {currentQuestion.options?.map((option) => (
                  <div key={option.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    {option.text || <span className="text-slate-400">Empty option</span>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-500">No question selected yet. Publish and start the session to display the first question.</p>
          )}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-lg font-semibold text-slate-900">Quick Overview</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Quiz title: {session.title}</li>
              <li>Session mode: {session.quiz?.mode || 'quiz'}</li>
              <li>Questions: {session.quiz?.questions.length || 0}</li>
              <li>Live participants: {session.participantsCount}</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-lg font-semibold text-slate-900">Teacher Controls</h3>
            <p className="mt-4 text-sm text-slate-600">Use the controls above to manage the session state and move through questions while students participate live.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
