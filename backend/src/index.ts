import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import sucursalRoutes from './routes/sucursales';
import maquinariaRoutes from './routes/maquinaria';
import comandaRoutes from './routes/comandas';
import resultadoRoutes from './routes/resultados';
import chatRoutes from './routes/chat';
import clienteRoutes from './routes/clientes';
import pdfRoutes from './routes/pdf';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
});

// Middleware
app.use(helmet());
app.use(limiter);
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sucursales', sucursalRoutes);
app.use('/api/maquinaria', maquinariaRoutes);
app.use('/api/comandas', comandaRoutes);
app.use('/api/resultados', resultadoRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/pdf', pdfRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Join user to their sucursal room
  socket.on('join-sucursal', (sucursalId: string) => {
    socket.join(`sucursal-${sucursalId}`);
    console.log(`Usuario ${socket.id} se unió a sucursal ${sucursalId}`);
  });

  // Join general chat
  socket.on('join-general', () => {
    socket.join('general');
    console.log(`Usuario ${socket.id} se unió al chat general`);
  });

  // Handle private messages
  socket.on('private-message', (data) => {
    socket.to(data.recipientId).emit('private-message', {
      from: socket.id,
      message: data.message,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
});

export { io };
