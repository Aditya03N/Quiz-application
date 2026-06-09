import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  participantId: { type: String, required: true },
  questionIndex: { type: Number, required: true },
  selectedOptionIds: { type: [String], default: [] },
  answerText: { type: String, default: '' },
  isCorrect: { type: Boolean, default: false },
  points: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now }
});

const Response = mongoose.model('Response', responseSchema);
export default Response;
