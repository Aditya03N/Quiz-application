import express from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { createQuiz, getQuizzes, getQuiz, publishQuiz, getDashboard } from '../controllers/quiz.controller.js';

const router = express.Router();

router.use(requireAuth);
router.get('/dashboard', getDashboard);
router.post('/', createQuiz);
router.get('/', getQuizzes);
router.get('/:id', getQuiz);
router.post('/:id/publish', publishQuiz);

export default router;
