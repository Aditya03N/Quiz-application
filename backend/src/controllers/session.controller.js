import Session from '../models/Session.js';
import Quiz from '../models/Quiz.js';
import Participant from '../models/Participant.js';
import Response from '../models/Response.js';
import { getIO } from '../config/socket.js';

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
    const { participantId, questionIndex, selectedOptionIds, answerText } = req.body;
    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required.' });
    }

    const session = await Session.findById(sessionId);
    if (!session || session.status !== 'live') {
      return res.status(400).json({ error: 'Session is not live.' });
    }

    const quiz = await Quiz.findById(session.quizId);
    const question = quiz.questions[questionIndex];
    if (!question) {
      return res.status(400).json({ error: 'Question not found.' });
    }

    const isCorrect = question.type !== 'short_answer' && question.type !== 'poll'
      ? (selectedOptionIds?.length === question.correctOptionIds.length &&
         selectedOptionIds?.every((id) => question.correctOptionIds.includes(id)))
      : false;
    const points = isCorrect ? question.points : 0;

    await Response.create({
      sessionId: session._id,
      participantId,
      questionIndex,
      selectedOptionIds: selectedOptionIds || [],
      answerText: answerText || '',
      isCorrect,
      points
    });

    const participant = await Participant.findOne({ sessionId: session._id, participantId });
    if (participant) {
      participant.answers.push({
        questionIndex,
        selectedOptionIds: selectedOptionIds || [],
        answerText: answerText || '',
        isCorrect,
        points
      });
      participant.score += points;
      await participant.save();
    }

    session.responsesCount += 1;
    await session.save();

    getIO().to(`teacher:${session._id}`).emit('session:answer-submitted', {
      sessionId: session._id,
      participantId,
      questionIndex,
      isCorrect,
      points
    });
    getIO().to(`session:${session._id}`).emit('session:update', { sessionId: session._id, responsesCount: session.responsesCount });

    res.json({ success: true, isCorrect, points });
  } catch (error) {
    next(error);
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
    if (action === 'start') {
      session.status = 'live';
      session.startedAt = now;
    } else if (action === 'pause') {
      session.status = 'paused';
    } else if (action === 'resume') {
      session.status = 'live';
    } else if (action === 'end') {
      session.status = 'finished';
      session.endedAt = now;
    } else if (action === 'next') {
      const quiz = await Quiz.findById(session.quizId);
      if (session.currentQuestionIndex < quiz.questions.length - 1) {
        session.currentQuestionIndex += 1;
      }
    } else if (action === 'prev') {
      if (session.currentQuestionIndex > 0) {
        session.currentQuestionIndex -= 1;
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
    const leaderboard = participants
      .map((participant) => ({ name: participant.name, score: participant.score }))
      .sort((a, b) => b.score - a.score);

    res.json({ session, participantsCount: session.participantsCount, responsesCount: session.responsesCount, leaderboard, participants, responses });
  } catch (error) {
    next(error);
  }
}
