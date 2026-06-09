import express from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
  getSessionByCode,
  getSession,
  joinSession,
  submitAnswer,
  controlSession,
  getSessionAnalytics,
  getParticipantResults
} from '../controllers/session.controller.js';

const router = express.Router();

router.get('/code/:joinCode', getSessionByCode);
router.get('/:sessionId', getSession);
router.post('/:sessionId/join', joinSession);
router.post('/:sessionId/answer', submitAnswer);
router.get('/:sessionId/participants/:participantId/results', getParticipantResults);
router.post('/:sessionId/control', requireAuth, controlSession);
router.get('/:sessionId/analytics', requireAuth, getSessionAnalytics);

export default router;
