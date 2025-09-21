const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');

const { initializeSocket } = require('./services/socketService');
const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'RoadLink API is running',
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🚗 RoadLink API Server running on port ${PORT}`);
});

initializeSocket(server);

module.exports = app;
