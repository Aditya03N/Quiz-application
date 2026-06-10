# Quiz & Polling Platform

A real-time Quiz & Polling Platform that enables teachers, trainers, recruiters, and event organizers to create interactive polls and quizzes, share them through links or QR codes, and visualize live results with animated charts.

## Features

### Poll Creation

* Create multiple-choice polls
* Add images to poll options
* Configure poll timers
* Save polls as reusable templates

### Real-Time Voting

* Vote without creating an account
* Instant result updates using Socket.IO
* Mobile-first voting experience
* One vote per device

### Live Results

* Animated bar charts
* Pie and donut chart visualizations
* Real-time vote tracking
* Automatic winner announcement

### Speaker View

* Full-screen presentation mode
* Large text and charts
* Presenter-friendly layout
* Live audience engagement

### Analytics

* Total voter count
* Response timeline
* Completion rate
* Poll participation statistics

## Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* React Router
* Axios
* Socket.IO Client
* Recharts
* Framer Motion

### Backend

* Node.js
* Express.js
* MongoDB Atlas
* Mongoose
* JWT Authentication
* Socket.IO

## Project Structure

```text
quiz-polling-platform/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── sockets/
│   └── package.json
│
├── prompts/
├── ARCHITECTURE.md
├── render.yaml
├── package.json
└── README.md
```

## Local Development

### Install Dependencies

```bash
npm run install:all
```

### Start Development Servers

```bash
npm run dev
```

This starts both frontend and backend simultaneously.

## Environment Variables

Create a `.env` file in the backend directory:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

## Build for Production

```bash
npm run build
```

## Run Production Server

```bash
npm start
```

## Deployment

### MongoDB Atlas

Create a MongoDB Atlas cluster and copy the connection string into `MONGODB_URI`.

### Render

The project includes a `render.yaml` file for deployment.

Required environment variables:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
FRONTEND_URL=https://your-render-app.onrender.com
NODE_ENV=production
```

After deployment, update `FRONTEND_URL` with your actual Render URL and redeploy.

## Live Demo

https://quiz-application-cytf.onrender.com

## Documentation

* ARCHITECTURE.md — System architecture and real-time communication design
* prompts/ — AI prompts used during development

## Future Improvements

* Quiz mode with scoring
* Word cloud visualization
* Custom themes and branding
* Redis-based scaling
* Advanced analytics dashboard

## Author

Aditya Anande

## License

This project is created for educational and portfolio purposes.
