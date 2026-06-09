import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchAnalytics } from '../../services/api.js';

function formatSeconds(value = 0) {
  const seconds = Math.max(0, Math.ceil(value));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

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

  const responseRows = useMemo(() => {
    if (!analytics?.participants || !analytics?.quiz) return [];
    return analytics.participants.map((participant) => {
      const answersByIndex = new Map(participant.answers.map((answer) => [answer.questionIndex, answer]));
      return {
        participant,
        answers: analytics.quiz.questions.map((question, index) => ({
          question,
          answer: answersByIndex.get(index)
        }))
      };
    });
  }, [analytics]);

  if (loading) {
    return <div className="min-h-screen bg-slate-100 px-4 py-8">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-lg bg-white p-8 shadow-sm">
          <p className="text-rose-600">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="mt-6 rounded-lg bg-brand-600 px-5 py-3 text-white">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-brand-600">Teacher report</p>
            <h1 className="mt-1 text-3xl font-bold">Session Analytics</h1>
            <p className="mt-2 text-slate-600">Scores, timing, correctness, and rankings for every student.</p>
          </div>
          <button onClick={() => navigate(`/teacher/live/${sessionId}`)} className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            Back to Live Session
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-slate-500">Students</p>
            <p className="mt-4 text-3xl font-bold">{analytics.participantsCount || 0}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-slate-500">Answers</p>
            <p className="mt-4 text-3xl font-bold">{analytics.responsesCount || 0}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-slate-500">Questions</p>
            <p className="mt-4 text-3xl font-bold">{analytics.quiz?.questions?.length || 0}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-slate-500">Leaderboard</p>
            <p className="mt-4 text-3xl font-bold">{analytics.leaderboard?.length || 0}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Leaderboard</h2>
            <div className="mt-5 space-y-3">
              {analytics.leaderboard?.length ? (
                analytics.leaderboard.map((entry, index) => (
                  <div key={entry.participantId} className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                    <div>
                      <p className="font-bold">#{index + 1} {entry.name}</p>
                      <p className="text-sm text-slate-500">{formatSeconds(entry.totalTimeSeconds)} total time</p>
                    </div>
                    <p className="text-lg font-bold">{entry.score} pts</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No scores yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Recent Answers</h2>
            <div className="mt-5 space-y-3">
              {analytics.responses?.length ? (
                analytics.responses.slice(-8).reverse().map((response) => (
                  <div key={response._id} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{response.participantName}</p>
                      <p className="text-sm text-slate-500">{response.questionText}</p>
                      <p className="text-sm text-slate-500">{formatSeconds(response.timeTakenSeconds)} - {response.autoSubmitted ? 'Auto submitted' : 'Manual submit'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${response.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {response.isCorrect ? 'Correct' : 'Wrong'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No answers recorded yet.</p>
              )}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-1">
            <h2 className="text-xl font-bold">Student Detail</h2>
            <p className="text-sm text-slate-500">See who answered correctly, how long they took, and whether time forced an auto-submit.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-3 py-2 font-semibold">Student</th>
                  <th className="px-3 py-2 font-semibold">Score</th>
                  <th className="px-3 py-2 font-semibold">Total Time</th>
                  {analytics.quiz?.questions?.map((question, index) => (
                    <th key={index} className="px-3 py-2 font-semibold">Q{index + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responseRows.map(({ participant, answers }) => (
                  <tr key={participant.participantId} className="bg-slate-50">
                    <td className="rounded-l-lg px-3 py-3 font-bold">{participant.name}</td>
                    <td className="px-3 py-3">{participant.score} pts</td>
                    <td className="px-3 py-3">{formatSeconds(participant.totalTimeSeconds)}</td>
                    {answers.map(({ answer }, index) => (
                      <td key={index} className="px-3 py-3">
                        {answer ? (
                          <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${answer.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {answer.isCorrect ? 'Correct' : 'Wrong'} - {formatSeconds(answer.timeTakenSeconds)}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-500">No answer</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
