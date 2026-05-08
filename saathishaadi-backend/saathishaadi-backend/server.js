/**
 * SaathiShaadi Backend - v2.0.0
 * 
 * Security Features:
 * ✅ Helmet (Security Headers)
 * ✅ Rate Limiting (DoS protection)
 * ✅ DDoS Detection & IP Auto-blacklist
 * ✅ MongoDB Injection Sanitization
 * ✅ XSS Protection
 * ✅ HTTP Parameter Pollution protection
 * ✅ CORS whitelist
 * ✅ Request compression
 * ✅ AES-256-GCM Encryption
 * ✅ Bcrypt OTP hashing
 * ✅ JWT token blacklist (logout)
 * ✅ Account lockout after failed attempts
 * ✅ Cryptographically secure OTP
 * ✅ Email OTP (Mobile OTP removed)
 * ✅ Winston logging
 * ✅ Input validation (express-validator)
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const logger = require('./utils/logger');
const {
  ipBlacklist,
  ddosProtection,
  globalLimiter,
  securityHeaders,
  cloudflareSecurity,
  suspiciousRequestLogger,
} = require('./middleware/security');

const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// ─── TRUST PROXY (for correct IP behind nginx/load balancer) ─────────────────
app.set('trust proxy', 1);

// ─── SECURITY MIDDLEWARE (order matters!) ────────────────────────────────────

// 1. Helmet - Standard security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// 2. Custom security headers
app.use(securityHeaders);
app.use(cloudflareSecurity);

// 3. DDoS detection (before rate limiter)
app.use(ddosProtection);

// 4. IP blacklist check
app.use(ipBlacklist);

// 5. Global rate limiter
app.use(globalLimiter);

// 6. Suspicious request logger
app.use(suspiciousRequestLogger);

// ─── CORS ────────────────────────────────────────────────────────────────────
// Sab allowed origins collect karo (env variables + localhost dev)
const buildAllowedOrigins = () => {
  const origins = new Set([
    'http://localhost:3000',
    'http://localhost:3001',
  ]);

  // FRONTEND_URL env se add karo (http aur https dono)
  const addWithVariants = (url) => {
    if (!url) return;
    const clean = url.replace(/\/$/, ''); // trailing slash hatao
    origins.add(clean);
    // http <-> https dono allow karo
    if (clean.startsWith('https://')) {
      origins.add(clean.replace('https://', 'http://'));
      // www variant bhi add karo
      if (!clean.includes('://www.')) {
        origins.add(clean.replace('https://', 'https://www.'));
        origins.add(clean.replace('https://', 'http://www.'));
      }
    } else if (clean.startsWith('http://')) {
      origins.add(clean.replace('http://', 'https://'));
      if (!clean.includes('://www.')) {
        origins.add(clean.replace('http://', 'http://www.'));
        origins.add(clean.replace('http://', 'https://www.'));
      }
    }
  };

  addWithVariants(process.env.FRONTEND_URL);
  addWithVariants(process.env.ADMIN_URL);

  // EXTRA_ORIGINS env se comma-separated list (optional)
  if (process.env.EXTRA_ORIGINS) {
    process.env.EXTRA_ORIGINS.split(',').forEach(o => addWithVariants(o.trim()));
  }

  return [...origins];
};

const allowedOrigins = buildAllowedOrigins();
logger.info('CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server (no origin) aur whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked: ${origin}`);
      callback(new Error(`CORS policy violation: ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// ─── REQUEST PROCESSING ──────────────────────────────────────────────────────
app.use(compression()); // Gzip compression
app.use(express.json({ limit: '10kb' })); // 10KB limit for JSON
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── SANITIZATION ────────────────────────────────────────────────────────────
app.use(mongoSanitize()); // MongoDB injection prevention ($, . removal)
app.use(xss()); // XSS attack prevention
app.use(hpp({ // HTTP Parameter Pollution prevention
  whitelist: ['religion', 'gender', 'district', 'caste'], // Allow these arrays
}));

// ─── LOGGING ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req, res) => res.statusCode < 400, // Log only errors in production
  }));
}

// ─── STATIC FILES ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true,
  dotfiles: 'deny', // Block .htaccess etc.
}));

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/pages', require('./routes/pages'));

// Health check (rate limited separately)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    time: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'SaathiShaadi API v2.0 Running 🕉️' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route nahi mila' });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path,
    ip: req.ip,
  });

  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Server mein kuch problem aayi. Baad mein try karein.'
    : err.message;

  res.status(err.status || 500).json({ message });
});

// ─── SOCKET.IO - Secure Real-time ────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB max message size
});

// Online users map: userId -> socketId
const onlineUsers = new Map();

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth token missing'));

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(new Error('Invalid or expired token'));
    }

    const user = await User.findById(decoded.id).select('_id name isBlocked');
    if (!user) return next(new Error('User not found'));
    if (user.isBlocked) return next(new Error('Account blocked'));

    socket.user = user;
    next();
  } catch (err) {
    logger.error('Socket auth error', { error: err.message });
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user._id.toString();
  onlineUsers.set(userId, socket.id);
  logger.info(`Socket connected: ${socket.user.name} [${socket.id}]`);

  socket.broadcast.emit('user_online', userId);

  socket.on('join_chat', ({ otherUserId }) => {
    if (typeof otherUserId !== 'string' || otherUserId.length > 50) return;
    const room = [userId, otherUserId].sort().join('_');
    socket.join(room);
  });

  socket.on('send_message', ({ receiverId, message }) => {
    if (typeof receiverId !== 'string' || typeof message !== 'object') return;
    const room = [userId, receiverId].sort().join('_');
    socket.to(room).emit('receive_message', message);
  });

  socket.on('typing', ({ receiverId }) => {
    if (typeof receiverId !== 'string') return;
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) io.to(receiverSocket).emit('typing', userId);
  });

  socket.on('call_user', ({ userToCall, signal, callType }) => {
    if (!['video', 'voice', 'audio'].includes(callType)) return;
    const targetSocket = onlineUsers.get(userToCall);
    if (targetSocket) {
      io.to(targetSocket).emit('incoming_call', {
        from: userId,
        fromName: socket.user.name,
        signal,
        callType,
      });
    } else {
      socket.emit('call_failed', { message: 'User offline hai' });
    }
  });

  socket.on('answer_call', ({ to, signal }) => {
    const targetSocket = onlineUsers.get(to);
    if (targetSocket) io.to(targetSocket).emit('call_accepted', { signal });
  });

  socket.on('end_call', ({ to }) => {
    const targetSocket = onlineUsers.get(to);
    if (targetSocket) io.to(targetSocket).emit('call_ended');
  });

  socket.on('ice_candidate', ({ to, candidate }) => {
    const targetSocket = onlineUsers.get(to);
    if (targetSocket) io.to(targetSocket).emit('ice_candidate', { from: userId, candidate });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    socket.broadcast.emit('user_offline', userId);
    logger.info(`Socket disconnected: ${socket.user.name}`);
  });

  // Rate limiting per socket
  let messageCount = 0;
  setInterval(() => { messageCount = 0; }, 60000);
  socket.use(([event, ...args], next) => {
    messageCount++;
    if (messageCount > 100) { // Max 100 socket events/min
      logger.warn(`Socket rate limit: ${socket.user.name}`);
      return next(new Error('Too many socket messages'));
    }
    next();
  });
});

// ─── DATABASE + SERVER START ──────────────────────────────────────────────────
const dropStaleIndexes = async () => {
  try {
    await mongoose.connection.db.collection('users').dropIndex('phone_1');
    logger.info('Dropped stale users.phone_1 index');
  } catch (err) {
    if (!['IndexNotFound', 'NamespaceNotFound'].includes(err.codeName)) {
      throw err;
    }
  }
};

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  logger.error('MONGO_URI not set!');
  process.exit(1);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  logger.error('JWT_SECRET must be at least 32 characters!');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  autoIndex: true,
  serverSelectionTimeoutMS: 5000,
})
  .then(async () => {
    logger.info('MongoDB connected successfully');
    await dropStaleIndexes();
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`SaathiShaadi backend running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    logger.error('MongoDB connection failed', { error: err.message });
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Graceful shutdown...');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message });
  process.exit(1);
});

module.exports = { app, server };
