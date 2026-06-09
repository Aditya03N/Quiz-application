import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  joinCode: { type: String, required: true, unique: true },
  joinUrl: { type: String, required: true },
  qrDataUrl: { type: String, default: '' },
  status: { type: String, enum: ['waiting', 'live', 'paused', 'finished'], default: 'waiting' },
  currentQuestionIndex: { type: Number, default: 0 },
  participantsCount: { type: Number, default: 0 },
  responsesCount: { type: Number, default: 0 },
  startedAt: { type: Date },
  endedAt: { type: Date }
}, { timestamps: true });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
