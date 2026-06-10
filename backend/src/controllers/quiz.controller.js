import Quiz from '../models/Quiz.js';
import Session from '../models/Session.js';
import Participant from '../models/Participant.js';
import { generateQrDataUrl } from '../utils/qr.util.js';

function createJoinCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createQuiz(req, res, next) {
  try {
    const { title, description, mode, questions } = req.body;
    const teacherId = req.user.id;

    if (!title || !questions?.length) {
      return res.status(400).json({ error: 'Title and at least one question are required.' });
    }

    const quiz = await Quiz.create({
      teacherId,
      title,
      description: description || '',
      mode: mode === 'poll' ? 'poll' : 'quiz',
      questions,
      published: false,
      status: 'draft'
    });

    res.status(201).json({ quiz });
  } catch (error) {
    next(error);
  }
}

export async function getQuizzes(req, res, next) {
  try {
    const teacherId = req.user.id;
    const quizzes = await Quiz.find({ teacherId }).sort({ createdAt: -1 });
    res.json({ quizzes });
  } catch (error) {
    next(error);
  }
}

export async function getQuiz(req, res, next) {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    if (quiz.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    res.json({ quiz });
  } catch (error) {
    next(error);
  }
}

export async function publishQuiz(req, res, next) {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    if (quiz.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (quiz.published) {
      return res.status(400).json({ error: 'Quiz is already published.' });
    }

    const joinCode = createJoinCode();
    
    // Determine the frontend base URL, falling back to Render's external URL or localhost
    const frontendBaseUrl = (process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173').replace(/\/$/, '');
    const joinUrl = `${frontendBaseUrl}/join/${joinCode}`;
    
    const qrDataUrl = await generateQrDataUrl(joinUrl);

    const sessionStatus = quiz.mode === 'poll' ? 'live' : 'waiting';
    const startedAt = sessionStatus === 'live' ? new Date() : undefined;

    const session = await Session.create({
      quizId: quiz._id,
      teacherId: quiz.teacherId,
      title: quiz.title,
      description: quiz.description,
      joinCode,
      joinUrl,
      qrDataUrl,
      status: sessionStatus,
      currentQuestionIndex: 0,
      startedAt
    });

    quiz.published = true;
    quiz.publishedAt = new Date();
    quiz.status = 'published';
    await quiz.save();

    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
}

export async function getDashboard(req, res, next) {
  try {
    const teacherId = req.user.id;
    const quizzes = await Quiz.find({ teacherId }).sort({ createdAt: -1 });
    const sessions = await Session.find({ teacherId }).sort({ createdAt: -1 });
    const participants = await Participant.find({ teacherId });

    const totalPolls = quizzes.filter((quiz) => quiz.mode === 'poll').length;
    const totalQuizzes = quizzes.filter((quiz) => quiz.mode === 'quiz').length;
    const totalParticipants = participants.length;
    const activeSessions = sessions.filter((session) => session.status === 'live').length;
    const completedSessions = sessions.filter((session) => session.status === 'finished').length;

    const recent = await Promise.all(quizzes.slice(0, 5).map(async (quiz) => {
      let sessionId = null;
      if (quiz.published) {
        const session = await Session.findOne({ quizId: quiz._id });
        sessionId = session?._id || null;
      }
      return {
        id: quiz._id,
        title: quiz.title,
        mode: quiz.mode,
        published: quiz.published,
        sessionId
      };
    }));

    const recentSessions = sessions.slice(0, 5).map((session) => ({
      id: session._id,
      title: session.title,
      status: session.status,
      joinCode: session.joinCode,
      participantsCount: session.participantsCount,
      createdAt: session.createdAt
    }));

    res.json({
      totalPolls,
      totalQuizzes,
      totalParticipants,
      activeSessions,
      completedSessions,
      recent,
      recentSessions
    });
  } catch (error) {
    next(error);
  }
}
