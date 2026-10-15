const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    connectedClients: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

// HTTP Broadcast endpoint (used by PHP backend & external services)
app.post('/api/broadcast', (req, res) => {
  const { event, data, room } = req.body;

  if (!event) {
    return res.status(400).json({ error: 'Event name is required' });
  }

  const payload = {
    ...data,
    _timestamp: Date.now()
  };

  if (room) {
    io.to(room).emit(event, payload);
    console.log(`[HTTP Broadcast to ${room}] Event: ${event}`, payload);
  } else {
    io.emit(event, payload);
    console.log(`[HTTP Broadcast] Event: ${event}`, payload);
  }

  return res.json({ success: true, event, room: room || 'global' });
});

// WebSocket Connection Lifecycle
io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id} (Total: ${io.engine.clientsCount})`);

  // User Room Subscription (for targeted notifications like KYC, order status, funds)
  socket.on('join_user', (userId) => {
    if (userId) {
      const room = `user_${userId}`;
      socket.join(room);
      console.log(`[Socket ${socket.id}] Joined room: ${room}`);
      socket.emit('joined_room', { room, status: 'success' });
    }
  });

  socket.on('leave_user', (userId) => {
    if (userId) {
      const room = `user_${userId}`;
      socket.leave(room);
      console.log(`[Socket ${socket.id}] Left room: ${room}`);
    }
  });

  // Client-initiated Real-Time Events (relayed to all other clients)
  const forwardEvents = [
    'MARKET_PRICE_UPDATED',
    'MARKET_INDEX_UPDATED',
    'ORDER_PLACED',
    'FUNDS_UPDATED',
    'KYC_STATUS_UPDATED',
    'REFRESH_DATA',
    'USER_DELETED',
    'FORCE_LOGOUT'
  ];

  forwardEvents.forEach((evt) => {
    socket.on(evt, (payload) => {
      console.log(`[Socket Relay] ${evt} from ${socket.id}:`, payload);
      const dataWithTimestamp = {
        ...payload,
        _timestamp: Date.now()
      };
      
      // Broadcast to everyone including sender, or broadcast to everyone except sender
      socket.broadcast.emit(evt, dataWithTimestamp);

      // If payload contains user_id, also emit specifically into that user room
      if (payload?.user_id) {
        io.to(`user_${payload.user_id}`).emit(evt, dataWithTimestamp);
      }
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket Disconnected] ID: ${socket.id}, Reason: ${reason} (Remaining: ${io.engine.clientsCount})`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 IGC Real-Time WebSocket Server running on port ${PORT}`);
  console.log(`📡 Local:   http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health:  http://localhost:${PORT}/health`);
  console.log(`====================================================`);
});
