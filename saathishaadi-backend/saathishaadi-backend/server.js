/**
 * SaathiShaadi Backend - v3.0.0
 * 
 * NEW in v3:
 * ✅ Admin-configurable settings (DB-backed)
 * ✅ Persistent IP blacklist (survives restarts)
 * ✅ Full access logging to DB
 * ✅ Call logs & recording support
 * ✅ Dynamic rate limiters (change from admin panel, no restart)
 * ✅ Maintenance mode
 * ✅ Cloudflare-only toggle from admin panel
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
  accessLogger,
  maintenanceCheck,
  loadDbBlacklist,
  refreshLimiters,
} = require('./middleware/security');

const User     = require('./models/User');
const Settings = require('./models/Settings');
const CallLog  = require('./models/CallLog');

const app    = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

// ─── SECURITY MIDDLEWARE ────────────────────────────────────────────────────

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

app.use(securityHeaders);
app.use(cloudflareSecurity);
app.use(ddosProtection);
app.use(ipBlacklist);
app.use(globalLimiter);
app.use(suspiciousRequestLogger);
app.use(maintenanceCheck);
app.use(accessLogger); // DB access logging

// ─── CORS ───────────────────────────────────────────────────────────────────

const buildAllowedOrigins = () => {
  const origins = new Set(['http://localhost:3000', 'http://localhost:3001','http://localhost:3002']);
  const addWithVariants = (url) => {
    if (!url) return;
    const clean = url.replace(/\/$/, '');
    origins.add(clean);
    if (clean.startsWith('https://')) {
      origins.add(clean.replace('https://', 'http://'));
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
  if (process.env.EXTRA_ORIGINS) {
    process.env.EXTRA_ORIGINS.split(',').forEach(o => addWithVariants(o.trim()));
  }
  return [...origins];
};

const allowedOrigins = buildAllowedOrigins();
logger.info('CORS origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn(`CORS blocked: ${origin}`);
    callback(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// ─── REQUEST PROCESSING ──────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp({ whitelist: ['religion', 'gender', 'district', 'caste'] }));

// ─── LOGGING ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req, res) => res.statusCode < 400,
  }));
}

// ─── STATIC FILES ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d', etag: true, dotfiles: 'deny',
}));

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/messages',  require('./routes/messages'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/ads',       require('./routes/ads'));
app.use('/api/pages',     require('./routes/pages'));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/', (req, res) => {
  res.json({ message: 'SaathiShaadi API v3.0 Running 🕉️' });
});

app.use((req, res) => res.status(404).json({ message: 'Route nahi mila' }));

app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path, ip: req.ip,
  });
  const message = process.env.NODE_ENV === 'production'
    ? 'Server mein kuch problem aayi.'
    : err.message;
  res.status(err.status || 500).json({ message });
});

// ─── SOCKET.IO ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
});

const onlineUsers = new Map(); // userId -> Set<socketId>
const activeCalls = new Map(); // callId -> { callerId, receiverId, callType, startTime, logId }

const addOnlineSocket = (userId, socketId) => {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
};

const removeOnlineSocket = (userId, socketId) => {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true;
  }
  return false;
};

const emitToUser = (io, userId, event, payload) => {
  const sockets = onlineUsers.get(userId);
  if (!sockets || sockets.size === 0) return false;
  sockets.forEach(socketId => io.to(socketId).emit(event, payload));
  return true;
};

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth token missing'));
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return next(new Error('Invalid token')); }
    const user = await User.findById(decoded.id).select('_id name email isBlocked');
    if (!user) return next(new Error('User not found'));
    if (user.isBlocked) return next(new Error('Account blocked'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user._id.toString();
  addOnlineSocket(userId, socket.id);
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
    emitToUser(io, receiverId, 'typing', userId);
  });

  // ─── Call Events with Logging ────────────────────────────────────────────
  socket.on('call_user', async ({ userToCall, signal, callType }) => {
    if (!['video', 'voice', 'audio'].includes(callType)) return;

    // Log call start
    const recordingEnabled = await Settings.get('call.recordingEnabled', false);
    const logEnabled = await Settings.get('call.logEnabled', true);

    let callLogId = null;
    if (logEnabled) {
      try {
        const receiver = await User.findById(userToCall).select('name email').lean();
        const callLog = await CallLog.create({
          callerId: userId,
          callerName: socket.user.name,
          callerEmail: socket.user.email,
          receiverId: userToCall,
          receiverName: receiver?.name,
          receiverEmail: receiver?.email,
          callType,
          startTime: new Date(),
          status: 'ongoing',
          recordingEnabled,
          callerIp: socket.handshake.address,
        });
        callLogId = callLog._id.toString();
        activeCalls.set(`${userId}_${userToCall}`, { callLogId, callType, startTime: Date.now() });
      } catch { /* ignore */ }
    }

    const delivered = emitToUser(io, userToCall, 'incoming_call', {
        from: userId,
        fromName: socket.user.name,
        signal,
        callType,
        callLogId,
        recordingEnabled,
      });

    if (!delivered) {
      socket.emit('call_failed', { message: 'User offline hai' });
      // Mark as missed
      if (callLogId) {
        await CallLog.findByIdAndUpdate(callLogId, { status: 'missed', endTime: new Date(), durationSeconds: 0 });
      }
    }
  });

  socket.on('answer_call', ({ to, signal, callLogId }) => {
    emitToUser(io, to, 'call_accepted', { signal, callLogId });
  });

  socket.on('reject_call', async ({ to, callLogId }) => {
    emitToUser(io, to, 'call_rejected');
    if (callLogId) {
      await CallLog.findByIdAndUpdate(callLogId, { status: 'rejected', endTime: new Date(), durationSeconds: 0 }).catch(() => {});
    }
  });

  socket.on('end_call', async ({ to, callLogId, durationSeconds }) => {
    emitToUser(io, to, 'call_ended');
    if (callLogId) {
      await CallLog.findByIdAndUpdate(callLogId, {
        status: 'completed',
        endTime: new Date(),
        durationSeconds: durationSeconds || 0,
        endReason: 'normal',
      }).catch(() => {});
    }
    activeCalls.delete(`${userId}_${to}`);
    activeCalls.delete(`${to}_${userId}`);
  });

  socket.on('ice_candidate', ({ to, candidate }) => {
    emitToUser(io, to, 'ice_candidate', { from: userId, candidate });
  });

  socket.on('disconnect', async () => {
    const wentOffline = removeOnlineSocket(userId, socket.id);
    if (wentOffline) socket.broadcast.emit('user_offline', userId);
    logger.info(`Socket disconnected: ${socket.user.name}`);

    // Auto-end any active calls on disconnect
    for (const [key, callData] of activeCalls.entries()) {
      if (key.startsWith(userId) || key.endsWith(userId)) {
        const duration = Math.round((Date.now() - callData.startTime) / 1000);
        if (callData.callLogId) {
          await CallLog.findByIdAndUpdate(callData.callLogId, {
            status: 'completed',
            endTime: new Date(),
            durationSeconds: duration,
            endReason: 'caller_disconnect',
          }).catch(() => {});
        }
        activeCalls.delete(key);
      }
    }
  });

  // Rate limiting per socket
  let messageCount = 0;
  const socketRateReset = setInterval(async () => {
    messageCount = 0;
  }, 60000);

  socket.on('disconnect', () => clearInterval(socketRateReset));

  socket.use(async ([event, ...args], next) => {
    messageCount++;
    const maxEvents = await Settings.get('system.socketRateLimitPerMin', 100);
    if (messageCount > maxEvents) {
      logger.warn(`Socket rate limit: ${socket.user.name}`);
      return next(new Error('Too many socket messages'));
    }
    next();
  });
});

// ─── DB + SERVER START ──────────────────────────────────────────────────────
const dropStaleIndexes = async () => {
  try {
    await mongoose.connection.db.collection('users').dropIndex('phone_1');
  } catch (err) {
    if (!['IndexNotFound', 'NamespaceNotFound'].includes(err.codeName)) throw err;
  }
};

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { logger.error('MONGO_URI not set!'); process.exit(1); }
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  logger.error('JWT_SECRET must be at least 32 characters!'); process.exit(1);
}

mongoose.connect(MONGO_URI, { autoIndex: true, serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    logger.info('MongoDB connected');
    await dropStaleIndexes();

    // Seed default settings
    await Settings.seedDefaults();
    logger.info('Settings seeded');

    // Load persisted IP blacklist into memory
    await loadDbBlacklist();

    // Initialize rate limiters from DB settings
    await refreshLimiters();

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`SaathiShaadi v3.0 running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    logger.error('MongoDB connection failed', { error: err.message });
    process.exit(1);
  });

process.on('SIGTERM', () => {
  logger.info('SIGTERM: Graceful shutdown...');
  server.close(() => { mongoose.connection.close(); process.exit(0); });
});
process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason: String(reason) }));
process.on('uncaughtException', (err) => { logger.error('Uncaught exception', { error: err.message }); process.exit(1); });

module.exports = { app, server };
