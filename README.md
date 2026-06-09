# Quiz & Polling Platform

Full-stack app scaffold for a teacher-facing quiz and polling platform.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios, Socket.IO Client
- Backend: Node.js, Express, MongoDB Atlas, Mongoose, JWT, Socket.IO

## Structure

- `frontend/` - React app
- `backend/` - Express API + Socket.IO

## Getting Started

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Deployment

Recommended setup:

- Full app: Render Web Service
- Database: MongoDB Atlas

### 1. MongoDB Atlas

Create a MongoDB Atlas cluster and copy the connection string. Use it as `MONGODB_URI`.

### 2. Deploy Full App on Render

Create a new Render Web Service from this repository. Render can use the included `render.yaml`.

If setting it manually:

- Root directory: leave blank / repository root
- Build command: `npm run build`
- Start command: `npm start`

Render environment variables:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=use_a_long_random_secret
FRONTEND_URL=https://your-render-app.onrender.com
NODE_ENV=production
```

After deploy, open the Render URL, for example:

```text
https://quiz-polling-platform.onrender.com
```

### 3. Redeploy After URL Is Known

After the first deploy, copy your real Render URL and update `FRONTEND_URL` to that same URL. Redeploy once.

No frontend env variables are required for Render-only deployment. In production the frontend uses:

```text
/api for API requests
the same Render origin for Socket.IO
```

### Render Build Flow

The root build command installs backend dependencies, installs frontend dependencies, and builds the frontend:

```bash
npm run build
```

The root start command starts the backend. In production, Express serves `frontend/dist` and the API from the same Render service:

```bash
npm start
```
