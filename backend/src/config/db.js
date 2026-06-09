import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quiz-polling';

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  console.log(`Connected to MongoDB: ${uri.includes('127.0.0.1') ? 'local' : 'atlas'}`);
}
