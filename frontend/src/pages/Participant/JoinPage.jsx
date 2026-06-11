import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socket from '../../services/socket.js';
import { fetchParticipantResults, fetchSessionByCode, joinSession, submitAnswer } from '../../services/api.js';

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

export default function JoinPage() {
  const { joinCode } = useParams();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(null);
  const [name, setName] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [answerText, setAnswerText] = useState('');
  // stores { [questionIndex]: { isCorrect, selectedOptionIds } } after submission
  const [submittedQuestions, setSubmittedQuestions] = useState({});
  const [results, setResults] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const submitLockRef = useRef(false);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetchSessionByCode(joinCode);
      setSessionData(response.data);
      setRemainingSeconds(getRemainingSeconds(response.data.session));
    } catch (_) {
      // Initial load handles the visible error.
    }
  }, [joinCode]);

  const refreshRef = useRef(refreshSession);
  useEffect(() => {
    refreshRef.current = refreshSession;
  }, [refreshSession]);

  const session = sessionData?.session;
  const quiz = sessionData?.quiz;
  const currentQuestionIndex = session?.currentQuestionIndex || 0;
  const currentQuestion = quiz?.questions?.[currentQuestionIndex] || null;
  const totalQuestions = quiz?.questions?.length || 0;
  const hasSubmittedCurrent = Boolean(submittedQuestions[currentQuestionIndex]);
  const submittedResult = submittedQuestions[currentQuestionIndex] || null;
  const correctOptionIds = currentQuestion?.correctOptionIds || [];
  const progressPercent = totalQuestions ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  const limitSeconds = currentQuestion?.timeLimit || 30;
  const timerPercent = Math.max(0, Math.min(100, (remainingSeconds / limitSeconds) * 100));

  const loadResults = useCallback(async () => {
    if (!session?._id || !participantId) return;
    const response = await fetchParticipantResults(session._id, participantId);
    setResults(response.data);
  }, [participantId, session?._id]);

  const handleAnswer = useCallback(async (autoSubmitted = false) => {
    if (!participantId || !session?._id || !currentQuestion || submitLockRef.current || submittedQuestions[currentQuestionIndex]) return;

    if (!autoSubmitted && currentQuestion.type !== 'short_answer' && currentQuestion.type !== 'poll' && selectedOptionIds.length === 0) {
      setError('Please select at least one answer option.');
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const response = await submitAnswer(session._id, {
        participantId,
        questionIndex: currentQuestionIndex,
        selectedOptionIds,
        answerText,
        autoSubmitted
      });

      setSubmittedQuestions((current) => ({
        ...current,
        [currentQuestionIndex]: {
          isCorrect: response.data.isCorrect,
          selectedOptionIds: [...selectedOptionIds]
        }
      }));
      setError(autoSubmitted ? 'Time ended. Your answer was submitted automatically.' : '');

      if (response.data.completed || currentQuestionIndex >= totalQuestions - 1) {
        await loadResults();
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to submit your answer.');
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }, [
    answerText,
    currentQuestion,
    currentQuestionIndex,
    loadResults,
    participantId,
    selectedOptionIds,
    session?._id,
    submittedQuestions,
    totalQuestions
  ]);

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
  }, [refreshSession]);

  useEffect(() => {
    if (!session?._id) return;
    socket.emit('subscribe-session', { sessionId: session._id });

    const handler = () => refreshRef.current();
    socket.on('session:update', handler);
    socket.on('session:control', handler);

    return () => {
      socket.off('session:update', handler);
      socket.off('session:control', handler);
    };
  }, [session?._id]);

  useEffect(() => {
    setSelectedOptionIds([]);
    setAnswerText('');
    submitLockRef.current = false;
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (!participantId || session?.status === 'live') return;
    const interval = setInterval(() => refreshRef.current(), 3000);
    return () => clearInterval(interval);
  }, [participantId, session?.status]);

  useEffect(() => {
    if (!participantId || session?.status !== 'live' || hasSubmittedCurrent || results) return;

    const tick = () => {
      const nextRemaining = getRemainingSeconds(session);
      setRemainingSeconds(nextRemaining);
      if (nextRemaining <= 0) {
        handleAnswer(true);
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [handleAnswer, hasSubmittedCurrent, participantId, results, session]);

  const toggleOption = (optionId) => {
    if (hasSubmittedCurrent) return;
    setSelectedOptionIds((current) => {
      if (currentQuestion?.type === 'single' || currentQuestion?.type === 'true_false') {
        return current.includes(optionId) ? [] : [optionId];
      }
      return current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
    });
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Please enter your name to join.');
      return;
    }
    if (!session?._id) return;

    try {
      const response = await joinSession(session._id, name.trim());
      setParticipantId(response.data.participant.participantId);
      setSessionData({ ...sessionData, session: response.data.session });
      setError('');
      socket.emit('join-session', { sessionId: session._id });
      await refreshSession();
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to join the session.');
    }
  };

  const rankedSelf = useMemo(() => {
    if (!results?.leaderboard) return null;
    const index = results.leaderboard.findIndex((entry) => entry.participantId === participantId);
    return index >= 0 ? { rank: index + 1, ...results.leaderboard[index] } : null;
  }, [participantId, results?.leaderboard]);

  if (loading) {
    return <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-700">Loading session...</div>;
  }

  if (error && !sessionData) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-sm">
          <p className="text-rose-600">{error}</p>
          <button onClick={() => navigate('/')} className="mt-6 rounded-lg bg-brand-600 px-5 py-3 text-white">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (results) {
    return (
      <div className="min-h-screen bg-[#f7f8fb] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-brand-600">Quiz complete</p>
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold">{results.quiz?.title}</h1>
                <p className="mt-2 text-slate-600">Great work, {results.participant?.name}. Your results are ready.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-slate-100 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Score</p>
                  <p className="text-2xl font-bold">{results.participant?.score || 0}</p>
                </div>
                <div className="rounded-lg bg-slate-100 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Time</p>
                  <p className="text-2xl font-bold">{formatSeconds(results.participant?.totalTimeSeconds)}</p>
                </div>
                <div className="rounded-lg bg-slate-100 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Rank</p>
                  <p className="text-2xl font-bold">{rankedSelf?.rank || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Answer Review</h2>
              <div className="mt-5 space-y-3">
                {results.questionResults?.map((question) => (
                  <div key={question.questionIndex} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-slate-900">Q{question.questionIndex + 1}. {question.questionText}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${question.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {question.isCorrect ? 'Correct' : question.autoSubmitted ? 'Auto submitted' : 'Incorrect'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {question.earnedPoints}/{question.points} points - {formatSeconds(question.timeTakenSeconds)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Leaderboard</h2>
              <div className="mt-5 space-y-3">
                {results.leaderboard?.map((entry, index) => (
                  <div key={entry.participantId} className={`flex items-center justify-between rounded-lg p-4 ${entry.participantId === participantId ? 'bg-brand-50 ring-1 ring-brand-500' : 'bg-slate-50'}`}>
                    <div>
                      <p className="font-bold text-slate-900">#{index + 1} {entry.name}</p>
                      <p className="text-sm text-slate-500">{formatSeconds(entry.totalTimeSeconds)} total time</p>
                    </div>
                    <p className="text-lg font-bold">{entry.score} pts</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-brand-600">Session {joinCode}</p>
            <h1 className="mt-1 text-3xl font-bold">{quiz?.title || 'Join Session'}</h1>
          </div>
          {participantId && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
              {name}
            </div>
          )}
        </div>

        {!participantId ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Enter your name</h2>
            <p className="mt-2 text-slate-600">Your timer starts when the teacher starts the session.</p>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Type your name"
              className="mt-6 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
            />
            {error && <div className="mt-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
            <button onClick={handleJoin} className="mt-5 rounded-lg bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">
              Join Session
            </button>
          </div>
        ) : session?.status !== 'live' ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
            <h2 className="text-2xl font-bold">You are in. Waiting for the teacher.</h2>
            <p className="mt-2 text-slate-500">Current status: <span className="font-semibold capitalize">{session?.status}</span></p>
          </div>
        ) : currentQuestion ? (
          <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
            <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase text-slate-500">Progress</p>
              <p className="mt-2 text-2xl font-bold">Question {currentQuestionIndex + 1} of {totalQuestions}</p>
              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-brand-600" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="mt-6 rounded-lg bg-slate-950 p-5 text-white">
                <p className="text-sm font-semibold uppercase text-slate-400">Time left</p>
                <p className="mt-2 text-5xl font-black tabular-nums">{formatSeconds(remainingSeconds)}</p>
                <div className="mt-4 h-2 rounded-full bg-white/15">
                  <div className={`h-2 rounded-full ${remainingSeconds <= 5 ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ width: `${timerPercent}%` }} />
                </div>
              </div>

              {hasSubmittedCurrent && (
                <div className={`mt-5 rounded-lg p-4 text-sm font-semibold ${submittedResult?.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {submittedResult?.isCorrect ? '✓ Correct! Well done.' : '✗ Incorrect. See the correct answer highlighted below.'}
                  <p className="mt-1 font-normal text-xs opacity-75">Wait for the next question.</p>
                </div>
              )}
            </aside>

            <main className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase text-brand-600">{currentQuestion.points} points</p>
              <h2 className="mt-2 text-2xl font-bold leading-tight">{currentQuestion.text}</h2>

              {currentQuestion.type === 'short_answer' ? (
                <textarea
                  value={answerText}
                  disabled={hasSubmittedCurrent}
                  onChange={(event) => setAnswerText(event.target.value)}
                  className="mt-6 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500 disabled:opacity-60"
                  rows="5"
                />
              ) : (
                <div className="mt-6 grid gap-3">
                  {currentQuestion.options?.map((option, index) => {
                    const selected = selectedOptionIds.includes(option.id);
                    const isCorrectOption = correctOptionIds.includes(option.id);
                    const wasSelectedByStudent = submittedResult?.selectedOptionIds?.includes(option.id);

                    let buttonClass = 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white';
                    let circleClass = 'bg-white text-slate-600 ring-1 ring-slate-200';

                    if (hasSubmittedCurrent) {
                      if (isCorrectOption) {
                        buttonClass = 'border-emerald-500 bg-emerald-50';
                        circleClass = 'bg-emerald-500 text-white';
                      } else if (wasSelectedByStudent && !isCorrectOption) {
                        buttonClass = 'border-rose-400 bg-rose-50';
                        circleClass = 'bg-rose-400 text-white';
                      } else {
                        buttonClass = 'border-slate-200 bg-slate-50 opacity-50';
                      }
                    } else if (selected) {
                      buttonClass = 'border-brand-600 bg-brand-50 shadow-sm';
                      circleClass = 'bg-brand-600 text-white';
                    }

                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={hasSubmittedCurrent}
                        onClick={() => toggleOption(option.id)}
                        className={`flex items-center gap-4 rounded-lg border p-4 text-left transition disabled:cursor-not-allowed ${buttonClass}`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${circleClass}`}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="font-semibold text-slate-800">{option.text || `Option ${index + 1}`}</span>
                        {hasSubmittedCurrent && isCorrectOption && (
                          <span className="ml-auto text-xs font-bold text-emerald-600">✓ Correct</span>
                        )}
                        {hasSubmittedCurrent && wasSelectedByStudent && !isCorrectOption && (
                          <span className="ml-auto text-xs font-bold text-rose-600">✗ Your answer</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {error && <div className="mt-5 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

              <button
                disabled={submitting || hasSubmittedCurrent}
                onClick={() => handleAnswer(false)}
                className="mt-6 w-full rounded-lg bg-brand-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {hasSubmittedCurrent ? 'Submitted' : submitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </main>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
            No active question is available yet.
          </div>
        )}
      </div>
    </div>
  );
}
