import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api'),
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('quiz-app-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function login(credentials) {
  return api.post('/auth/login', credentials);
}

export function register(credentials) {
  return api.post('/auth/register', credentials);
}

export function fetchDashboard() {
  return api.get('/quizzes/dashboard');
}

export function createQuiz(payload) {
  return api.post('/quizzes', payload);
}

export function publishQuiz(id) {
  return api.post(`/quizzes/${id}/publish`);
}

export function getQuizzes() {
  return api.get('/quizzes');
}

export function getQuiz(id) {
  return api.get(`/quizzes/${id}`);
}

export function fetchSessionByCode(joinCode) {
  return api.get(`/sessions/code/${joinCode}`);
}

export function joinSession(sessionId, name) {
  return api.post(`/sessions/${sessionId}/join`, { name });
}

export function submitAnswer(sessionId, payload) {
  return api.post(`/sessions/${sessionId}/answer`, payload);
}

export function controlSession(sessionId, action) {
  return api.post(`/sessions/${sessionId}/control`, { action });
}

export function fetchSession(sessionId) {
  return api.get(`/sessions/${sessionId}`);
}

export function fetchAnalytics(sessionId) {
  return api.get(`/sessions/${sessionId}/analytics`);
}

export function fetchParticipantResults(sessionId, participantId) {
  return api.get(`/sessions/${sessionId}/participants/${participantId}/results`);
}

export default api;
