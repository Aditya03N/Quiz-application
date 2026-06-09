import { Server } from 'socket.io';
import Session from '../models/Session.js';
import Quiz from '../models/Quiz.js';
import Participant from '../models/Participant.js';
import Response from '../models/Response.js';

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('subscribe-teacher', ({ sessionId }) => {
      socket.join(`teacher:${sessionId}`);
    });

    socket.on('subscribe-session', ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
    });

    socket.on('join-session', async ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
      const session = await Session.findById(sessionId);
      if (!session) return;

      io.to(`session:${sessionId}`).emit('session:update', { sessionId, participantsCount: session.participantsCount });
    });

    socket.on('submit-answer', async ({ sessionId, participantId, questionIndex, selectedOptionIds, answerText }) => {
      const session = await Session.findById(sessionId);
      if (!session || session.status !== 'live') return;
      const quiz = await Quiz.findById(session.quizId);
      const question = quiz.questions[questionIndex];
      if (!question) return;

      const isCorrect = question.type !== 'short_answer' && question.type !== 'poll'
        ? selectedOptionIds?.every((id) => question.correctOptionIds.includes(id))
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
        participant.answers.push({ questionIndex, selectedOptionIds: selectedOptionIds || [], answerText: answerText || '', isCorrect, points });
        participant.score += points;
        await participant.save();
      }

      session.responsesCount += 1;
      await session.save();

      io.to(`teacher:${sessionId}`).emit('session:answer-submitted', {
        sessionId,
        participantId,
        questionIndex,
        isCorrect,
        points
      });
      io.to(`session:${sessionId}`).emit('session:update', { sessionId, responsesCount: session.responsesCount });
    });

    socket.on('session-control', async ({ sessionId, action }) => {
      const session = await Session.findById(sessionId);
      if (!session) return;
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
      io.to(`teacher:${sessionId}`).emit('session:control', { session });
      io.to(`session:${sessionId}`).emit('session:control', { session });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
}
