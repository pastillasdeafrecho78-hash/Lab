import { Router } from 'express';
import { body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { CustomError } from '../middleware/errorHandler';
import { ApiResponse, PaginatedResponse, User } from '../types';

const router = Router();
const prisma = new PrismaClient();

// GET /api/users
router.get('/', authenticateToken, requireRole(['SUPER_ADMIN', 'RESPONSABLE_SANITARIO']), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        include: {
          sucursalesAsignadas: {
            include: {
              sucursal: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count()
    ]);

    const response: PaginatedResponse<Partial<User>> = {
      success: true,
      data: users.map(user => ({
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        telefono: user.telefono,
        role: user.role,
        sucursales: user.sucursalesAsignadas.map(su => su.sucursalId),
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
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

// GET /api/users/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        sucursalesAsignadas: {
          include: {
            sucursal: true
          }
        }
      }
    });

    if (!user) {
      throw new CustomError('Usuario no encontrado', 404);
    }

    const response: ApiResponse<Partial<User>> = {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        telefono: user.telefono,
        role: user.role,
        sucursales: user.sucursalesAsignadas.map(su => su.sucursalId),
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id
router.put('/:id', 
  authenticateToken, 
  requireRole(['SUPER_ADMIN', 'RESPONSABLE_SANITARIO']),
  auditLog('UPDATE', 'USER'),
  [
    body('nombre').optional().isLength({ min: 2 }),
    body('apellido').optional().isLength({ min: 2 }),
    body('telefono').optional().isMobilePhone('es-MX'),
    body('role').optional().isIn(['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'TECNICO_LABORATORIO', 'RECEPCION']),
    body('isActive').optional().isBoolean()
  ],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { nombre, apellido, telefono, role, isActive, sucursales } = req.body;

      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        throw new CustomError('Usuario no encontrado', 404);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          nombre,
          apellido,
          telefono,
          role,
          isActive
        },
        include: {
          sucursalesAsignadas: {
            include: {
              sucursal: true
            }
          }
        }
      });

      // Actualizar sucursales si se proporcionan
      if (sucursales) {
        // Eliminar asignaciones existentes
        await prisma.sucursalUser.deleteMany({
          where: { userId: id }
        });

        // Crear nuevas asignaciones
        if (sucursales.length > 0) {
          await prisma.sucursalUser.createMany({
            data: sucursales.map((sucursalId: string) => ({
              sucursalId,
              userId: id
            }))
          });
        }
      }

      const response: ApiResponse<Partial<User>> = {
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          nombre: updatedUser.nombre,
          apellido: updatedUser.apellido,
          telefono: updatedUser.telefono,
          role: updatedUser.role,
          sucursales: updatedUser.sucursalesAsignadas.map(su => su.sucursalId),
          isActive: updatedUser.isActive,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        },
        message: 'Usuario actualizado exitosamente',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/users/:id
router.delete('/:id', 
  authenticateToken, 
  requireRole(['SUPER_ADMIN']),
  auditLog('DELETE', 'USER'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        throw new CustomError('Usuario no encontrado', 404);
      }

      await prisma.user.update({
        where: { id },
        data: { isActive: false }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Usuario desactivado exitosamente',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
