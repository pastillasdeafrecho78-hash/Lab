import { Router } from 'express';
import { body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { CustomError } from '../middleware/errorHandler';
import { ApiResponse, PaginatedResponse, Sucursal } from '../types';

const router = Router();
const prisma = new PrismaClient();

// GET /api/sucursales
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [sucursales, total] = await Promise.all([
      prisma.sucursal.findMany({
        skip,
        take: limit,
        include: {
          usuarios: {
            include: {
              user: true
            }
          },
          maquinaria: true,
          _count: {
            select: {
              comandas: true,
              usuarios: true,
              maquinaria: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.sucursal.count()
    ]);

    const response: PaginatedResponse<Sucursal> = {
      success: true,
      data: sucursales.map(sucursal => ({
        id: sucursal.id,
        nombre: sucursal.nombre,
        direccion: sucursal.direccion,
        telefono: sucursal.telefono,
        email: sucursal.email,
        isActive: sucursal.isActive,
        createdAt: sucursal.createdAt,
        updatedAt: sucursal.updatedAt
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

// GET /api/sucursales/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const sucursal = await prisma.sucursal.findUnique({
      where: { id },
      include: {
        usuarios: {
          include: {
            user: true
          }
        },
        maquinaria: true,
        _count: {
          select: {
            comandas: true,
            usuarios: true,
            maquinaria: true
          }
        }
      }
    });

    if (!sucursal) {
      throw new CustomError('Sucursal no encontrada', 404);
    }

    const response: ApiResponse<Sucursal> = {
      success: true,
      data: {
        id: sucursal.id,
        nombre: sucursal.nombre,
        direccion: sucursal.direccion,
        telefono: sucursal.telefono,
        email: sucursal.email,
        isActive: sucursal.isActive,
        createdAt: sucursal.createdAt,
        updatedAt: sucursal.updatedAt
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/sucursales
router.post('/', 
  authenticateToken, 
  requireRole(['SUPER_ADMIN', 'RESPONSABLE_SANITARIO']),
  auditLog('CREATE', 'SUCURSAL'),
  [
    body('nombre').isLength({ min: 2 }),
    body('direccion').isLength({ min: 5 }),
    body('telefono').isMobilePhone('es-MX'),
    body('email').optional().isEmail()
  ],
  async (req, res, next) => {
    try {
      const { nombre, direccion, telefono, email } = req.body;

      const sucursal = await prisma.sucursal.create({
        data: {
          nombre,
          direccion,
          telefono,
          email
        }
      });

      const response: ApiResponse<Sucursal> = {
        success: true,
        data: sucursal,
        message: 'Sucursal creada exitosamente',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/sucursales/:id
router.put('/:id', 
  authenticateToken, 
  requireRole(['SUPER_ADMIN', 'RESPONSABLE_SANITARIO']),
  auditLog('UPDATE', 'SUCURSAL'),
  [
    body('nombre').optional().isLength({ min: 2 }),
    body('direccion').optional().isLength({ min: 5 }),
    body('telefono').optional().isMobilePhone('es-MX'),
    body('email').optional().isEmail(),
    body('isActive').optional().isBoolean()
  ],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { nombre, direccion, telefono, email, isActive } = req.body;

      const sucursal = await prisma.sucursal.findUnique({
        where: { id }
      });

      if (!sucursal) {
        throw new CustomError('Sucursal no encontrada', 404);
      }

      const updatedSucursal = await prisma.sucursal.update({
        where: { id },
        data: {
          nombre,
          direccion,
          telefono,
          email,
          isActive
        }
      });

      const response: ApiResponse<Sucursal> = {
        success: true,
        data: updatedSucursal,
        message: 'Sucursal actualizada exitosamente',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/sucursales/:id
router.delete('/:id', 
  authenticateToken, 
  requireRole(['SUPER_ADMIN']),
  auditLog('DELETE', 'SUCURSAL'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const sucursal = await prisma.sucursal.findUnique({
        where: { id }
      });

      if (!sucursal) {
        throw new CustomError('Sucursal no encontrada', 404);
      }

      await prisma.sucursal.update({
        where: { id },
        data: { isActive: false }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Sucursal desactivada exitosamente',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
