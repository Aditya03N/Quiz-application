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

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

### 1. MongoDB Atlas

Create a MongoDB Atlas cluster and copy the connection string. Use it as `MONGODB_URI`.

### 2. Deploy Backend on Render

Create a new Render Web Service from this repository. If Render detects `render.yaml`, use it.

If setting it manually:

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

Backend environment variables:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=use_a_long_random_secret
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

After deploy, copy the Render backend URL, for example:

```text
https://quiz-polling-backend.onrender.com
```

### 3. Deploy Frontend on Vercel

Create a new Vercel project from this repository.

Set:

- Root directory: `frontend`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

Frontend environment variables:

```env
VITE_API_URL=https://your-render-backend.onrender.com/api
VITE_SOCKET_URL=https://your-render-backend.onrender.com
```

After Vercel deploys, copy the Vercel URL and put it into Render's `FRONTEND_URL`.

### 4. Redeploy

Redeploy both services after environment variables are set:

1. Redeploy backend on Render.
2. Redeploy frontend on Vercel.
3. Open the Vercel frontend URL.

Do not deploy the backend to Vercel serverless functions because this project uses Express and Socket.IO live connections.
