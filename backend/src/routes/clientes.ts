import { Router } from 'express';
import { body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { CustomError } from '../middleware/errorHandler';
import { ApiResponse, PaginatedResponse, Cliente } from '../types';

const router = Router();
const prisma = new PrismaClient();

// GET /api/clientes
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const where = search ? {
      OR: [
        { nombre: { contains: search, mode: 'insensitive' } },
        { apellido: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telefono: { contains: search } }
      ]
    } : {};

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              comandas: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.cliente.count({ where })
    ]);

    const response: PaginatedResponse<Cliente> = {
      success: true,
      data: clientes.map(cliente => ({
        id: cliente.id,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        email: cliente.email,
        telefono: cliente.telefono,
        fechaNacimiento: cliente.fechaNacimiento,
        genero: cliente.genero,
        direccion: cliente.direccion,
        isActive: cliente.isActive,
        createdAt: cliente.createdAt,
        updatedAt: cliente.updatedAt
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

// GET /api/clientes/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        comandas: {
          include: {
            sucursal: true,
            resultados: true
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            comandas: true
          }
        }
      }
    });

    if (!cliente) {
      throw new CustomError('Cliente no encontrado', 404);
    }

    const response: ApiResponse<Cliente> = {
      success: true,
      data: {
        id: cliente.id,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        email: cliente.email,
        telefono: cliente.telefono,
        fechaNacimiento: cliente.fechaNacimiento,
        genero: cliente.genero,
        direccion: cliente.direccion,
        isActive: cliente.isActive,
        createdAt: cliente.createdAt,
        updatedAt: cliente.updatedAt
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/clientes
router.post('/', 
  authenticateToken, 
  requireRole(['RECEPCION', 'RESPONSABLE_SUCURSAL', 'RESPONSABLE_SANITARIO']),
  auditLog('CREATE', 'CLIENTE'),
  [
    body('nombre').isLength({ min: 2 }),
    body('apellido').isLength({ min: 2 }),
    body('email').isEmail().normalizeEmail(),
    body('telefono').isMobilePhone('es-MX'),
    body('fechaNacimiento').isISO8601(),
    body('genero').isIn(['M', 'F', 'O']),
    body('direccion').optional().isLength({ min: 5 })
  ],
  async (req, res, next) => {
    try {
      const { nombre, apellido, email, telefono, fechaNacimiento, genero, direccion } = req.body;

      // Verificar si el cliente ya existe
      const existingCliente = await prisma.cliente.findUnique({
        where: { email }
      });

      if (existingCliente) {
        throw new CustomError('Ya existe un cliente con este email', 400);
      }

      const cliente = await prisma.cliente.create({
        data: {
          nombre,
          apellido,
          email,
          telefono,
          fechaNacimiento: new Date(fechaNacimiento),
          genero,
          direccion
        }
      });

      const response: ApiResponse<Cliente> = {
        success: true,
        data: {
          id: cliente.id,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          email: cliente.email,
          telefono: cliente.telefono,
          fechaNacimiento: cliente.fechaNacimiento,
          genero: cliente.genero,
          direccion: cliente.direccion,
          isActive: cliente.isActive,
          createdAt: cliente.createdAt,
          updatedAt: cliente.updatedAt
        },
        message: 'Cliente creado exitosamente',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/clientes/:id
router.put('/:id', 
  authenticateToken, 
  requireRole(['RECEPCION', 'RESPONSABLE_SUCURSAL', 'RESPONSABLE_SANITARIO']),
  auditLog('UPDATE', 'CLIENTE'),
  [
    body('nombre').optional().isLength({ min: 2 }),
    body('apellido').optional().isLength({ min: 2 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('telefono').optional().isMobilePhone('es-MX'),
    body('fechaNacimiento').optional().isISO8601(),
    body('genero').optional().isIn(['M', 'F', 'O']),
    body('direccion').optional().isLength({ min: 5 }),
    body('isActive').optional().isBoolean()
  ],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { nombre, apellido, email, telefono, fechaNacimiento, genero, direccion, isActive } = req.body;

      const cliente = await prisma.cliente.findUnique({
        where: { id }
      });

      if (!cliente) {
        throw new CustomError('Cliente no encontrado', 404);
      }

      // Verificar email único si se está cambiando
      if (email && email !== cliente.email) {
        const existingCliente = await prisma.cliente.findUnique({
          where: { email }
        });

        if (existingCliente) {
          throw new CustomError('Ya existe un cliente con este email', 400);
        }
      }

      const updatedCliente = await prisma.cliente.update({
        where: { id },
        data: {
          nombre,
          apellido,
          email,
          telefono,
          fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
          genero,
          direccion,
          isActive
        }
      });

      const response: ApiResponse<Cliente> = {
        success: true,
        data: {
          id: updatedCliente.id,
          nombre: updatedCliente.nombre,
          apellido: updatedCliente.apellido,
          email: updatedCliente.email,
          telefono: updatedCliente.telefono,
          fechaNacimiento: updatedCliente.fechaNacimiento,
          genero: updatedCliente.genero,
          direccion: updatedCliente.direccion,
          isActive: updatedCliente.isActive,
          createdAt: updatedCliente.createdAt,
          updatedAt: updatedCliente.updatedAt
        },
        message: 'Cliente actualizado exitosamente',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/clientes/:id
router.delete('/:id', 
  authenticateToken, 
  requireRole(['RESPONSABLE_SANITARIO']),
  auditLog('DELETE', 'CLIENTE'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const cliente = await prisma.cliente.findUnique({
        where: { id }
      });

      if (!cliente) {
        throw new CustomError('Cliente no encontrado', 404);
      }

      await prisma.cliente.update({
        where: { id },
        data: { isActive: false }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Cliente desactivado exitosamente',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
