import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  selectedOptionIds: { type: [String], default: [] },
  answerText: { type: String, default: '' },
  isCorrect: { type: Boolean, default: false },
  points: { type: Number, default: 0 },
  timeTakenSeconds: { type: Number, default: 0 },
  autoSubmitted: { type: Boolean, default: false },
  submittedAt: { type: Date }
});

const participantSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  participantId: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  totalTimeSeconds: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  answers: { type: [answerSchema], default: [] }
});

const Participant = mongoose.model('Participant', participantSchema);
export default Participant;
