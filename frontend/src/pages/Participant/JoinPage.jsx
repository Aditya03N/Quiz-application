import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socket from '../../services/socket.js';
import { fetchSessionByCode, joinSession, submitAnswer } from '../../services/api.js';

export default function JoinPage() {
  const { joinCode } = useParams();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(null);
  const [name, setName] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [answerText, setAnswerText] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refreshSession = async () => {
    try {
      const response = await fetchSessionByCode(joinCode);
      setSessionData(response.data);
    } catch (_) {
      // ignore refresh errors
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        await refreshSession();
      } catch (err) {
        setError('Session not found. Please check the join link.');
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, [joinCode]);

  useEffect(() => {
    if (!sessionData?.session?._id) return;
    const sessionId = sessionData.session._id;
    socket.emit('subscribe-session', { sessionId });

    socket.on('session:update', refreshSession);
    socket.on('session:control', refreshSession);

    return () => {
      socket.off('session:update');
      socket.off('session:control');
    };
  }, [sessionData, joinCode]);

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Please enter your name to join.');
      return;
    }
    if (!sessionData?.session?._id) return;

    try {
      const response = await joinSession(sessionData.session._id, name.trim());
      setParticipantId(response.data.participant.participantId);
      setSessionData({ ...sessionData, session: response.data.session });
      setError('');
      setHasSubmitted(false);
      socket.emit('join-session', { sessionId: sessionData.session._id });
      await refreshSession();
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to join the session.');
    }
  };

  const handleAnswer = async () => {
    if (!participantId || !sessionData?.session?._id) return;
    const currentQuestion = sessionData.quiz?.questions?.[sessionData.session.currentQuestionIndex];
    if (!currentQuestion) return;

    if (currentQuestion.type !== 'short_answer' && currentQuestion.type !== 'poll' && selectedOptionIds.length === 0) {
      setError('Please select at least one answer option.');
      return;
    }

    setSubmitting(true);
    try {
      await submitAnswer(sessionData.session._id, {
        participantId,
        questionIndex: sessionData.session.currentQuestionIndex,
        selectedOptionIds,
        answerText
      });
      setHasSubmitted(true);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to submit your answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleOption = (optionId) => {
    setSelectedOptionIds((current) =>
      current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
    );
  };

  const currentQuestion = sessionData?.quiz?.questions?.[sessionData?.session?.currentQuestionIndex] || null;

  useEffect(() => {
    setSelectedOptionIds([]);
    setAnswerText('');
    setHasSubmitted(false);
  }, [sessionData?.session?.currentQuestionIndex]);

  useEffect(() => {
    if (!participantId || sessionData?.session?.status === 'live') return;
    const interval = setInterval(refreshSession, 5000);
    return () => clearInterval(interval);
  }, [participantId, sessionData?.session?.status, joinCode]);

  if (loading) {
    return <div className="min-h-screen bg-slate-100 px-4 py-8">Loading session...</div>;
  }

  if (error && !sessionData) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-lg">
          <p className="text-rose-600">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 rounded-2xl bg-brand-600 px-5 py-3 text-white"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Join Session</h1>
            <p className="mt-2 text-slate-600">Participate in live quizzes and polls using the session link.</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
            Session code: <span className="font-semibold text-slate-900">{joinCode}</span>
          </div>
        </div>

        {!participantId ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Your Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Type your name"
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
              />
            </div>
            {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
            <button
              onClick={handleJoin}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Join Session
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl bg-slate-50 p-6">
              <h2 className="text-xl font-semibold text-slate-900">{sessionData.quiz?.title}</h2>
              <p className="mt-2 text-slate-600">{sessionData.quiz?.description}</p>
              <p className="mt-4 text-sm text-slate-500">Waiting for the session to start if it is not live yet.</p>
            </div>

            {sessionData.session?.status !== 'live' ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
                The session is currently <span className="font-semibold">{sessionData.session?.status}</span>. Please wait for your teacher to start the quiz.
              </div>
            ) : currentQuestion ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-xl font-semibold text-slate-900">Question</h2>
                <p className="mt-3 text-lg text-slate-900">{currentQuestion.text}</p>

                {currentQuestion.type === 'short_answer' ? (
                  <div className="mt-5">
                    <label className="block text-sm font-medium text-slate-700">Your Answer</label>
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-brand-500"
                      rows="4"
                    />
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {currentQuestion.options?.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleOption(option.id)}
                        className={`rounded-2xl border p-4 text-left text-sm transition ${selectedOptionIds.includes(option.id)
                          ? 'border-brand-600 bg-brand-50 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-700'}`}
                      >
                        {option.text || `Option ${option.id}`}
                      </button>
                    ))}
                  </div>
                )}

                {error && <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

                <button
                  disabled={submitting || hasSubmitted}
                  onClick={handleAnswer}
                  className="mt-6 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                >
                  {hasSubmitted ? 'Answer Submitted' : 'Submit Answer'}
                </button>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
                No active question is available yet. Please wait for the teacher to present the next question.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
