import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true }
});

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: {
    type: String,
    enum: ['single', 'multiple', 'true_false', 'short_answer', 'poll'],
    default: 'single'
  },
  options: { type: [optionSchema], default: [] },
  correctOptionIds: { type: [String], default: [] },
  points: { type: Number, default: 1 },
  timeLimit: { type: Number, default: 30 }
});

const quizSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  mode: { type: String, enum: ['quiz', 'poll'], default: 'quiz' },
  questions: { type: [questionSchema], default: [] },
  published: { type: Boolean, default: false },
  publishedAt: { type: Date },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' }
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
