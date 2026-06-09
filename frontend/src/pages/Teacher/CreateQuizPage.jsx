import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuiz, publishQuiz } from '../../services/api.js';

const defaultQuestion = () => ({
  text: '',
  type: 'single',
  options: [
    { id: 'a', text: '' },
    { id: 'b', text: '' }
  ],
  correctOptionIds: [],
  points: 1,
  timeLimit: 30
});

export default function CreateQuizPage() {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    mode: 'quiz',
    questions: [defaultQuestion()]
  });
  const [status, setStatus] = useState(null);
  const [joinUrl, setJoinUrl] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [publishedSessionId, setPublishedSessionId] = useState('');
  const [saving, setSaving] = useState(false);

  const updateQuestion = (index, change) => {
    setQuiz((current) => ({
      ...current,
      questions: current.questions.map((question, i) => (i === index ? { ...question, ...change } : question))
    }));
  };

  const updateOption = (questionIndex, optionIndex, text) => {
    setQuiz((current) => ({
      ...current,
      questions: current.questions.map((question, i) => {
        if (i !== questionIndex) return question;
        return {
          ...question,
          options: question.options.map((option, j) => j === optionIndex ? { ...option, text } : option)
        };
      })
    }));
  };

  const addQuestion = () => {
    setQuiz((current) => ({
      ...current,
      questions: [...current.questions, defaultQuestion()]
    }));
  };

  const removeQuestion = (index) => {
    setQuiz((current) => ({
      ...current,
      questions: current.questions.filter((_, i) => i !== index)
    }));
  };

  const addOption = (questionIndex) => {
    setQuiz((current) => ({
      ...current,
      questions: current.questions.map((question, i) => {
        if (i !== questionIndex) return question;
        return {
          ...question,
          options: [...question.options, { id: `opt-${Date.now()}`, text: '' }]
        };
      })
    }));
  };

  const toggleAnswer = (questionIndex, optionId) => {
    setQuiz((current) => ({
      ...current,
      questions: current.questions.map((question, i) => {
        if (i !== questionIndex) return question;
        const has = question.correctOptionIds.includes(optionId);
        return {
          ...question,
          correctOptionIds: has
            ? question.correctOptionIds.filter((id) => id !== optionId)
            : [...question.correctOptionIds, optionId]
        };
      })
    }));
  };

  const handleSave = async (publish = false) => {
    setStatus(null);
    setSaving(true);
    try {
      const response = await createQuiz(quiz);
      const quizId = response.data.quiz?._id;
      if (publish) {
        const publishResponse = await publishQuiz(quizId);
        setPublishedSessionId(publishResponse.data.session?._id || '');
        setJoinUrl(publishResponse.data.session?.joinUrl || '');
        setQrCode(publishResponse.data.session?.qrDataUrl || '');
        setStatus('Quiz published. Share the join link with your class!');
      } else {
        setStatus('Draft saved successfully. You can publish it when ready.');
      }
      if (!publish) {
        navigate('/dashboard');
      }
    } catch (error) {
      setStatus(error?.response?.data?.error || 'Unable to save the quiz.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-lg">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Create Quiz or Poll</h1>
            <p className="mt-2 text-slate-600">Build a new activity, save drafts, and publish live sessions instantly.</p>
          </div>
          <div className="flex gap-3">
            <button
              className="rounded-2xl border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={() => navigate('/dashboard')}
              type="button"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Title</span>
              <input
                value={quiz.title}
                onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="Example: Biology Review Quiz"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Mode</span>
              <select
                value={quiz.mode}
                onChange={(e) => setQuiz({ ...quiz, mode: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
              >
                <option value="quiz">Quiz</option>
                <option value="poll">Poll</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              value={quiz.description}
              onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
              rows="3"
            />
          </label>

          <div className="space-y-8">
            {quiz.questions.map((question, index) => (
              <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Question {index + 1}</h2>
                    <p className="text-sm text-slate-500">Add question text and answer options.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
                <label className="block mb-4">
                  <span className="text-sm font-medium text-slate-700">Question Text</span>
                  <input
                    value={question.text}
                    onChange={(e) => updateQuestion(index, { text: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-brand-500"
                    placeholder="Enter the question prompt"
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Points</span>
                    <input
                      type="number"
                      min="1"
                      value={question.points}
                      onChange={(e) => updateQuestion(index, { points: Number(e.target.value) })}
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-brand-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Time Limit (sec)</span>
                    <input
                      type="number"
                      min="10"
                      value={question.timeLimit}
                      onChange={(e) => updateQuestion(index, { timeLimit: Number(e.target.value) })}
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-brand-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Answer Type</span>
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(index, { type: e.target.value, correctOptionIds: [] })}
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-brand-500"
                    >
                      <option value="single">Single Choice</option>
                      <option value="multiple">Multiple Choice</option>
                      <option value="poll">Poll</option>
                    </select>
                  </label>
                </div>
                <div className="mt-6 space-y-4">
                  <p className="text-sm font-medium text-slate-700">Answer Options</p>
                  {question.options.map((option, optionIndex) => (
                    <div key={option.id} className="flex items-center gap-3">
                      <label className="flex-1">
                        <input
                          value={option.text}
                          onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-brand-500"
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={question.correctOptionIds.includes(option.id)}
                          onChange={() => toggleAnswer(index, option.id)}
                        />
                        Correct
                      </label>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(index)}
                    className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    Add Option
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <button
              type="button"
              onClick={addQuestion}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Add Question
            </button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                Publish Quiz
              </button>
            </div>
          </div>

          {status && (
            <div className="rounded-3xl border border-brand-100 bg-brand-50 p-4 text-sm text-slate-900">
              {status}
            </div>
          )}

          {joinUrl && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-semibold text-slate-900">Share this Live Session</h2>
              <p className="mt-2 text-slate-600">Students can join with this link or QR code.</p>
              <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
                <div className="rounded-3xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Join URL</p>
                  <a className="mt-2 block text-brand-600 underline" href={joinUrl} target="_blank" rel="noreferrer">
                    {joinUrl}
                  </a>
                </div>
                {qrCode && (
                  <div className="rounded-3xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">QR Code</p>
                    <img src={qrCode} alt="Session QR code" className="mt-2 h-40 w-40 object-contain" />
                  </div>
                )}
              </div>
              {publishedSessionId && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => navigate(`/teacher/live/${publishedSessionId}`)}
                    className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    Go to Live Session Control
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
