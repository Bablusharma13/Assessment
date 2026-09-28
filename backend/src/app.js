import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';

const app = express();

// Do not advertise that the server runs Express.
app.disable('x-powered-by');

// Allow requests only from our frontend.
app.use(cors({ origin: env.frontendUrl }));

// Parse JSON request bodies into req.body (small limit: we only receive short text).
app.use(express.json({ limit: '10kb' }));

// Health check used to confirm the API is up (e.g. by Render).
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// These two must stay last: unknown routes → 404, then every error → JSON response.
app.use(notFound);
app.use(errorHandler);

export default app;
