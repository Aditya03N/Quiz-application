# Architecture

## System Overview

The application follows a client-server architecture with real-time communication using Socket.IO.

## Frontend Architecture

Technologies:

* React
* Vite
* Tailwind CSS
* Socket.IO Client
* Recharts

Modules:

* Poll Creation
* Voting Interface
* Results Dashboard
* Speaker View
* Analytics

## Backend Architecture

Technologies:

* Node.js
* Express.js
* MongoDB
* Socket.IO

Modules:

* Authentication
* Poll Management
* Vote Processing
* Analytics Service
* Real-Time Communication

## Database Design

### Poll Collection

```js
{
  title: String,
  options: Array,
  timerDuration: Number,
  status: String,
  createdAt: Date
}
```

### Vote Collection

```js
{
  pollId: ObjectId,
  optionId: ObjectId,
  voterFingerprint: String,
  createdAt: Date
}
```

## Real-Time Update Flow

1. User creates poll.
2. Poll stored in MongoDB.
3. Participants join through QR code or link.
4. Vote submitted.
5. Vote stored in database.
6. Socket.IO broadcasts update.
7. Connected clients receive latest results.
8. Charts update instantly.

## Scalability Strategy

* Socket.IO rooms
* Indexed MongoDB queries
* Efficient vote aggregation
* Optimized frontend rendering
* Supports 500+ concurrent users

## Deployment

Frontend and backend are deployed on Render.

MongoDB Atlas is used as the cloud database.
