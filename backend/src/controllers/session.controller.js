import Session from '../models/Session.js';
import Quiz from '../models/Quiz.js';
import Participant from '../models/Participant.js';
import Response from '../models/Response.js';
import { getIO } from '../config/socket.js';

function getQuestionWindow(quiz, questionIndex, now = new Date()) {
  const question = quiz.questions?.[questionIndex];
  const seconds = Math.max(Number(question?.timeLimit || 30), 1);
  return {
    startedAt: now,
    endsAt: new Date(now.getTime() + seconds * 1000)
  };
}

function applyQuestionWindow(session, quiz, now = new Date()) {
  const window = getQuestionWindow(quiz, session.currentQuestionIndex, now);
  session.currentQuestionStartedAt = window.startedAt;
  session.currentQuestionEndsAt = window.endsAt;
}

function calculateScore(question, selectedOptionIds = []) {
  const selected = selectedOptionIds || [];
  const isCorrect = question.type !== 'short_answer' && question.type !== 'poll'
    ? (selected.length === question.correctOptionIds.length &&
       selected.every((id) => question.correctOptionIds.includes(id)))
    : false;

  return {
    isCorrect,
    points: isCorrect ? question.points : 0
  };
}

function calculateTimeTaken(session, submittedAt = new Date()) {
  if (!session.currentQuestionStartedAt) return 0;
  const elapsed = Math.ceil((submittedAt.getTime() - new Date(session.currentQuestionStartedAt).getTime()) / 1000);
  const limit = session.currentQuestionEndsAt
    ? Math.ceil((new Date(session.currentQuestionEndsAt).getTime() - new Date(session.currentQuestionStartedAt).getTime()) / 1000)
    : elapsed;
  return Math.max(0, Math.min(elapsed, limit));
}

function buildLeaderboard(participants) {
  return participants
    .map((participant) => ({
      participantId: participant.participantId,
      name: participant.name,
      score: participant.score,
      totalTimeSeconds: participant.totalTimeSeconds || 0,
      completedAt: participant.completedAt
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.totalTimeSeconds || 0) - (b.totalTimeSeconds || 0);
    });
}

async function recordAnswer({ session, quiz, participantId, questionIndex, selectedOptionIds = [], answerText = '', autoSubmitted = false }) {
  if (session.status !== 'live') {
    const expired = session.currentQuestionEndsAt && new Date() >= new Date(session.currentQuestionEndsAt);
    if (!expired) {
      throw new Error('Session is not live.');
    }
  }

  const question = quiz.questions[questionIndex];
  if (!question) {
    throw new Error('Question not found.');
  }

  const participant = await Participant.findOne({ sessionId: session._id, participantId });
  if (!participant) {
    throw new Error('Participant not found.');
  }

  const existing = await Response.findOne({ sessionId: session._id, participantId, questionIndex });
  if (existing) {
    return { response: existing, participant, alreadySubmitted: true };
  }

  const submittedAt = new Date();
  const { isCorrect, points } = calculateScore(question, selectedOptionIds);
  const timeTakenSeconds = calculateTimeTaken(session, submittedAt);

  const response = await Response.create({
    sessionId: session._id,
    participantId,
    questionIndex,
    selectedOptionIds,
    answerText,
    isCorrect,
    points,
    timeTakenSeconds,
    autoSubmitted,
    submittedAt
  });

  participant.answers.push({
    questionIndex,
    selectedOptionIds,
    answerText,
    isCorrect,
    points,
    timeTakenSeconds,
    autoSubmitted,
    submittedAt
  });
  participant.score += points;
  participant.totalTimeSeconds = (participant.totalTimeSeconds || 0) + timeTakenSeconds;

  if (participant.answers.length >= quiz.questions.length) {
    participant.completedAt = submittedAt;
  }

  await participant.save();

  session.responsesCount += 1;
  await session.save();

  return { response, participant, alreadySubmitted: false };
}

export async function getSessionByCode(req, res, next) {
  try {
    const { joinCode } = req.params;
    const session = await Session.findOne({ joinCode });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const quiz = await Quiz.findById(session.quizId);
    res.json({ session, quiz });
  } catch (error) {
    next(error);
  }
}

export async function getSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const quiz = await Quiz.findById(session.quizId);
    res.json({ session, quiz });
  } catch (error) {
    next(error);
  }
}

export async function joinSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required to join.' });
    }

    const session = await Session.findById(sessionId);
    if (!session || session.status === 'finished') {
      return res.status(400).json({ error: 'Unable to join this session.' });
    }

    const participantId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const participant = await Participant.create({
      sessionId: session._id,
      teacherId: session.teacherId,
      name,
      participantId,
      score: 0,
      answers: []
    });

    session.participantsCount += 1;
    await session.save();

    getIO().to(`teacher:${session._id}`).emit('session:participant-joined', {
      sessionId: session._id,
      participant: { id: participant.participantId, name: participant.name }
    });
    getIO().to(`session:${session._id}`).emit('session:update', { sessionId: session._id, participantsCount: session.participantsCount });

    res.json({ session, participant });
  } catch (error) {
    next(error);
  }
}

export async function submitAnswer(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { participantId, questionIndex, selectedOptionIds, answerText, autoSubmitted } = req.body;
    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required.' });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(400).json({ error: 'Session is not live.' });
    }

    const quiz = await Quiz.findById(session.quizId);
    const result = await recordAnswer({
      session,
      quiz,
      participantId,
      questionIndex,
      selectedOptionIds: selectedOptionIds || [],
      answerText: answerText || '',
      autoSubmitted: Boolean(autoSubmitted)
    });

    if (!result.alreadySubmitted) {
      getIO().to(`teacher:${session._id}`).emit('session:answer-submitted', {
        sessionId: session._id,
        participantId,
        questionIndex,
        isCorrect: result.response.isCorrect,
        points: result.response.points,
        timeTakenSeconds: result.response.timeTakenSeconds,
        autoSubmitted: result.response.autoSubmitted
      });
      getIO().to(`session:${session._id}`).emit('session:update', { sessionId: session._id, responsesCount: session.responsesCount });
    }

    res.json({
      success: true,
      alreadySubmitted: result.alreadySubmitted,
      isCorrect: result.response.isCorrect,
      points: result.response.points,
      timeTakenSeconds: result.response.timeTakenSeconds,
      autoSubmitted: result.response.autoSubmitted,
      completed: result.participant.answers.length >= quiz.questions.length
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Unable to submit your answer.' });
  }
}

export async function controlSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { action } = req.body;
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const now = new Date();
    const quiz = await Quiz.findById(session.quizId);
    if (action === 'start') {
      session.status = 'live';
      session.startedAt = now;
      session.currentQuestionIndex = session.currentQuestionIndex || 0;
      applyQuestionWindow(session, quiz, now);
    } else if (action === 'pause') {
      session.status = 'paused';
    } else if (action === 'resume') {
      session.status = 'live';
      applyQuestionWindow(session, quiz, now);
    } else if (action === 'end') {
      session.status = 'finished';
      session.endedAt = now;
    } else if (action === 'next') {
      if (session.currentQuestionIndex < quiz.questions.length - 1) {
        session.currentQuestionIndex += 1;
        applyQuestionWindow(session, quiz, now);
      }
    } else if (action === 'prev') {
      if (session.currentQuestionIndex > 0) {
        session.currentQuestionIndex -= 1;
        applyQuestionWindow(session, quiz, now);
      }
    }

    await session.save();
    getIO().to(`teacher:${session._id}`).emit('session:control', { session });
    getIO().to(`session:${session._id}`).emit('session:control', { session });

    res.json({ session });
  } catch (error) {
    next(error);
  }
}

export async function getSessionAnalytics(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const participants = await Participant.find({ sessionId: session._id });
    const responses = await Response.find({ sessionId: session._id });
    const quiz = await Quiz.findById(session.quizId);
    const participantById = new Map(participants.map((participant) => [participant.participantId, participant]));
    const leaderboard = buildLeaderboard(participants);
    const detailedResponses = responses.map((response) => {
      const participant = participantById.get(response.participantId);
      const question = quiz?.questions?.[response.questionIndex];
      return {
        ...response.toObject(),
        participantName: participant?.name || 'Unknown student',
        questionText: question?.text || `Question ${response.questionIndex + 1}`
      };
    });

    res.json({ session, quiz, participantsCount: session.participantsCount, responsesCount: session.responsesCount, leaderboard, participants, responses: detailedResponses });
  } catch (error) {
    next(error);
  }
}

export async function getParticipantResults(req, res, next) {
  try {
    const { sessionId, participantId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const quiz = await Quiz.findById(session.quizId);
    const participant = await Participant.findOne({ sessionId: session._id, participantId });
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found.' });
    }

    const participants = await Participant.find({ sessionId: session._id });
    const leaderboard = buildLeaderboard(participants);
    const answersByIndex = new Map(participant.answers.map((answer) => [answer.questionIndex, answer]));
    const questionResults = quiz.questions.map((question, index) => {
      const answer = answersByIndex.get(index);
      return {
        questionIndex: index,
        questionText: question.text,
        points: question.points,
        earnedPoints: answer?.points || 0,
        isCorrect: Boolean(answer?.isCorrect),
        selectedOptionIds: answer?.selectedOptionIds || [],
        correctOptionIds: question.correctOptionIds,
        timeTakenSeconds: answer?.timeTakenSeconds || 0,
        autoSubmitted: Boolean(answer?.autoSubmitted)
      };
    });

    res.json({ session, quiz, participant, leaderboard, questionResults });
  } catch (error) {
    next(error);
  }
}
