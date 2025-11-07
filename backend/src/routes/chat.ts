import { Router } from 'express';
import { body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { CustomError } from '../middleware/errorHandler';
import { ApiResponse, PaginatedResponse, ChatRoom, Mensaje, TipoSala, TipoMensaje } from '../types';

const router = Router();
const prisma = new PrismaClient();

// GET /api/chat/rooms
router.get('/rooms', authenticateToken, async (req, res, next) => {
  try {
    const rooms = await prisma.chatRoom.findMany({
      where: {
        isActive: true,
        OR: [
          { tipo: 'GENERAL' },
          { 
            tipo: 'SUCURSAL',
            sucursalId: { in: req.user!.sucursales }
          }
        ]
      },
      include: {
        sucursal: true,
        _count: {
          select: {
            mensajes: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const response: ApiResponse<ChatRoom[]> = {
      success: true,
      data: rooms.map(room => ({
        id: room.id,
        nombre: room.nombre,
        tipo: room.tipo,
        sucursalId: room.sucursalId,
        isActive: room.isActive,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt
      })),
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/chat/rooms/:id/messages
router.get('/rooms/:id/messages', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Verificar que el usuario tiene acceso a la sala
    const room = await prisma.chatRoom.findUnique({
      where: { id },
      include: { sucursal: true }
    });

    if (!room) {
      throw new CustomError('Sala de chat no encontrada', 404);
    }

    if (room.tipo === 'SUCURSAL' && room.sucursalId && !req.user!.sucursales.includes(room.sucursalId)) {
      throw new CustomError('No tienes acceso a esta sala', 403);
    }

    const [mensajes, total] = await Promise.all([
      prisma.mensaje.findMany({
        where: { salaId: id },
        skip,
        take: limit,
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mensaje.count({ where: { salaId: id } })
    ]);

    const response: PaginatedResponse<Mensaje> = {
      success: true,
      data: mensajes.map(mensaje => ({
        id: mensaje.id,
        salaId: mensaje.salaId,
        usuarioId: mensaje.usuarioId,
        contenido: mensaje.contenido,
        tipo: mensaje.tipo,
        archivoUrl: mensaje.archivoUrl,
        isEdited: mensaje.isEdited,
        createdAt: mensaje.createdAt,
        updatedAt: mensaje.updatedAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/chat/rooms
router.post('/rooms', 
  authenticateToken, 
  auditLog('CREATE', 'CHAT_ROOM'),
  [
    body('nombre').isLength({ min: 2 }),
    body('tipo').isIn(Object.values(TipoSala)),
    body('sucursalId').optional().isUUID()
  ],
  async (req, res, next) => {
    try {
      const { nombre, tipo, sucursalId } = req.body;

      // Verificar permisos para crear sala de sucursal
      if (tipo === 'SUCURSAL' && sucursalId && !req.user!.sucursales.includes(sucursalId)) {
        throw new CustomError('No tienes acceso a esta sucursal', 403);
      }

      const room = await prisma.chatRoom.create({
        data: {
          nombre,
          tipo,
          sucursalId: tipo === 'SUCURSAL' ? sucursalId : null
        }
      });

      const response: ApiResponse<ChatRoom> = {
        success: true,
        data: {
          id: room.id,
          nombre: room.nombre,
          tipo: room.tipo,
          sucursalId: room.sucursalId,
          isActive: room.isActive,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt
        },
        message: 'Sala de chat creada exitosamente',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/chat/messages
router.post('/messages', 
  authenticateToken, 
  auditLog('CREATE', 'MENSAJE'),
  [
    body('salaId').isUUID(),
    body('contenido').isLength({ min: 1 }),
    body('tipo').optional().isIn(Object.values(TipoMensaje)),
    body('archivoUrl').optional().isURL()
  ],
  async (req, res, next) => {
    try {
      const { salaId, contenido, tipo = 'TEXTO', archivoUrl } = req.body;

      // Verificar que el usuario tiene acceso a la sala
      const room = await prisma.chatRoom.findUnique({
        where: { id: salaId },
        include: { sucursal: true }
      });

      if (!room) {
        throw new CustomError('Sala de chat no encontrada', 404);
      }

      if (room.tipo === 'SUCURSAL' && room.sucursalId && !req.user!.sucursales.includes(room.sucursalId)) {
        throw new CustomError('No tienes acceso a esta sala', 403);
      }

      const mensaje = await prisma.mensaje.create({
        data: {
          salaId,
          usuarioId: req.user!.id,
          contenido,
          tipo,
          archivoUrl
        },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              role: true
            }
          }
        }
      });

      const response: ApiResponse<Mensaje> = {
        success: true,
        data: {
          id: mensaje.id,
          salaId: mensaje.salaId,
          usuarioId: mensaje.usuarioId,
          contenido: mensaje.contenido,
          tipo: mensaje.tipo,
          archivoUrl: mensaje.archivoUrl,
          isEdited: mensaje.isEdited,
          createdAt: mensaje.createdAt,
          updatedAt: mensaje.updatedAt
        },
        message: 'Mensaje enviado exitosamente',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/chat/messages/:id
router.put('/messages/:id', 
  authenticateToken, 
  auditLog('UPDATE', 'MENSAJE'),
  [
    body('contenido').isLength({ min: 1 })
  ],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { contenido } = req.body;

      const mensaje = await prisma.mensaje.findUnique({
        where: { id }
      });

      if (!mensaje) {
        throw new CustomError('Mensaje no encontrado', 404);
      }

      // Solo el autor puede editar su mensaje
      if (mensaje.usuarioId !== req.user!.id) {
        throw new CustomError('No puedes editar este mensaje', 403);
      }

      const updatedMensaje = await prisma.mensaje.update({
        where: { id },
        data: {
          contenido,
          isEdited: true
        }
      });

      const response: ApiResponse<Mensaje> = {
        success: true,
        data: {
          id: updatedMensaje.id,
          salaId: updatedMensaje.salaId,
          usuarioId: updatedMensaje.usuarioId,
          contenido: updatedMensaje.contenido,
          tipo: updatedMensaje.tipo,
          archivoUrl: updatedMensaje.archivoUrl,
          isEdited: updatedMensaje.isEdited,
          createdAt: updatedMensaje.createdAt,
          updatedAt: updatedMensaje.updatedAt
        },
        message: 'Mensaje actualizado exitosamente',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
