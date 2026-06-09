import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socket from '../../services/socket.js';
import { controlSession, fetchSession, fetchAnalytics } from '../../services/api.js';

function formatSeconds(value = 0) {
  const seconds = Math.max(0, Math.ceil(value));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function getRemainingSeconds(session) {
  if (!session?.currentQuestionEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(session.currentQuestionEndsAt).getTime() - Date.now()) / 1000));
}

export default function LiveSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchSession(sessionId);
        setSession({ ...response.data.session, quiz: response.data.quiz });
        setRemainingSeconds(getRemainingSeconds(response.data.session));
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
        setRemainingSeconds(getRemainingSeconds(response.data.session));
        const analyticsResponse = await fetchAnalytics(sessionId);
        setAnalytics(analyticsResponse.data);
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
      setRemainingSeconds(getRemainingSeconds(response.data.session));
      const analyticsResponse = await fetchAnalytics(sessionId);
      setAnalytics(analyticsResponse.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update session.');
    }
  };

  useEffect(() => {
    if (session?.status !== 'live') return;
    const interval = setInterval(() => setRemainingSeconds(getRemainingSeconds(session)), 500);
    return () => clearInterval(interval);
  }, [session]);

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
  const timerLimit = currentQuestion?.timeLimit || 30;
  const timerPercent = Math.max(0, Math.min(100, (remainingSeconds / timerLimit) * 100));
  const currentQuestionResponses = analytics?.responses?.filter((response) => response.questionIndex === session.currentQuestionIndex) || [];

  return (
    <div className="min-h-screen bg-[#f7f8fb] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Live Session</h1>
            <p className="mt-2 text-slate-600">Control your active session and track participation in real time.</p>
          </div>
          <button
            onClick={() => navigate(`/analytics/${sessionId}`)}
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            View Analytics
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-slate-500">Status</p>
            <p className="mt-4 text-2xl font-bold capitalize text-slate-900">{session.status || 'draft'}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-slate-500">Participants</p>
            <p className="mt-4 text-2xl font-bold text-slate-900">{session.participantsCount || 0}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-slate-500">Responses</p>
            <p className="mt-4 text-2xl font-bold text-slate-900">{currentQuestionResponses.length}/{session.participantsCount || 0}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-slate-500">Session Code</p>
            <p className="mt-4 text-2xl font-bold text-slate-900">{session.joinCode}</p>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Current Question</h2>
              <p className="mt-1 text-sm text-slate-500">Question {session.currentQuestionIndex + 1} of {session.quiz.questions.length}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {session.status === 'waiting' && (
                <button
                  onClick={() => handleControl('start')}
                  className="rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Start Session
                </button>
              )}
              {session.status === 'live' && (
                <>
                  <button
                    onClick={() => handleControl('pause')}
                    className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => handleControl('prev')}
                    disabled={session.currentQuestionIndex === 0}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous Question
                  </button>
                  <button
                    onClick={() => handleControl('next')}
                    disabled={session.currentQuestionIndex === session.quiz.questions.length - 1}
                    className="rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Next Question
                  </button>
                  <button
                    onClick={() => handleControl('end')}
                    className="rounded-lg bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    End Session
                  </button>
                </>
              )}
              {session.status === 'paused' && (
                <>
                  <button
                  onClick={() => handleControl('resume')}
                    className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => handleControl('end')}
                    className="rounded-lg bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    End Session
                  </button>
                </>
              )}
            </div>
          </div>

          {currentQuestion ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <p className="text-lg font-bold text-slate-900">{currentQuestion.text}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {currentQuestion.options?.map((option) => (
                    <div key={option.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-medium text-slate-700">
                      {option.text || <span className="text-slate-400">Empty option</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-slate-950 p-5 text-white">
                <p className="text-sm font-semibold uppercase text-slate-400">Question timer</p>
                <p className="mt-2 text-5xl font-black tabular-nums">{formatSeconds(remainingSeconds)}</p>
                <div className="mt-4 h-2 rounded-full bg-white/15">
                  <div className={`h-2 rounded-full ${remainingSeconds <= 5 ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ width: `${timerPercent}%` }} />
                </div>
                <p className="mt-3 text-sm text-slate-300">{currentQuestion.timeLimit || 30} seconds set by teacher</p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">No question selected yet. Publish and start the session to display the first question.</p>
          )}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Quick Overview</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Quiz title: {session.title}</li>
              <li>Session mode: {session.quiz?.mode || 'quiz'}</li>
              <li>Questions: {session.quiz?.questions.length || 0}</li>
              <li>Live participants: {session.participantsCount}</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Current Question Responses</h3>
            <div className="mt-4 space-y-3">
              {currentQuestionResponses.length ? (
                currentQuestionResponses.slice().reverse().map((response) => (
                  <div key={response._id} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{response.participantName}</p>
                      <p className="text-sm text-slate-500">{formatSeconds(response.timeTakenSeconds)} - {response.autoSubmitted ? 'Auto submitted' : 'Manual submit'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${response.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {response.isCorrect ? 'Correct' : 'Wrong'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No answers for this question yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
