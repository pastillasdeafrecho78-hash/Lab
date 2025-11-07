import { Router } from 'express';
import { body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { CustomError } from '../middleware/errorHandler';
import { ApiResponse, PaginatedResponse, Maquinaria } from '../types';

const router = Router();
const prisma = new PrismaClient();

// GET /api/maquinaria
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const sucursalId = req.query.sucursalId as string;

    const where = sucursalId ? { sucursalId } : {};

    const [maquinaria, total] = await Promise.all([
      prisma.maquinaria.findMany({
        where,
        skip,
        take: limit,
        include: {
          sucursal: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.maquinaria.count({ where })
    ]);

    const response: PaginatedResponse<Maquinaria> = {
      success: true,
      data: maquinaria.map(maq => ({
        id: maq.id,
        nombre: maq.nombre,
        modelo: maq.modelo,
        marca: maq.marca,
        numeroSerie: maq.numeroSerie,
        sucursalId: maq.sucursalId,
        tipoPruebas: maq.tipoPruebas,
        isActive: maq.isActive,
        ultimoMantenimiento: maq.ultimoMantenimiento,
        proximoMantenimiento: maq.proximoMantenimiento,
        createdAt: maq.createdAt,
        updatedAt: maq.updatedAt
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

// GET /api/maquinaria/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const maquinaria = await prisma.maquinaria.findUnique({
      where: { id },
      include: {
        sucursal: true
      }
    });

    if (!maquinaria) {
      throw new CustomError('Maquinaria no encontrada', 404);
    }

    const response: ApiResponse<Maquinaria> = {
      success: true,
      data: {
        id: maquinaria.id,
        nombre: maquinaria.nombre,
        modelo: maquinaria.modelo,
        marca: maquinaria.marca,
        numeroSerie: maquinaria.numeroSerie,
        sucursalId: maquinaria.sucursalId,
        tipoPruebas: maquinaria.tipoPruebas,
        isActive: maquinaria.isActive,
        ultimoMantenimiento: maquinaria.ultimoMantenimiento,
        proximoMantenimiento: maquinaria.proximoMantenimiento,
        createdAt: maquinaria.createdAt,
        updatedAt: maquinaria.updatedAt
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/maquinaria
router.post('/', 
  authenticateToken, 
  requireRole(['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL']),
  auditLog('CREATE', 'MAQUINARIA'),
  [
    body('nombre').isLength({ min: 2 }),
    body('modelo').isLength({ min: 1 }),
    body('marca').isLength({ min: 1 }),
    body('numeroSerie').isLength({ min: 1 }),
    body('sucursalId').isUUID(),
    body('tipoPruebas').isArray()
  ],
  async (req, res, next) => {
    try {
      const { nombre, modelo, marca, numeroSerie, sucursalId, tipoPruebas, ultimoMantenimiento, proximoMantenimiento } = req.body;

      // Verificar que la sucursal existe
      const sucursal = await prisma.sucursal.findUnique({
        where: { id: sucursalId }
      });

      if (!sucursal) {
        throw new CustomError('Sucursal no encontrada', 404);
      }

      const maquinaria = await prisma.maquinaria.create({
        data: {
          nombre,
          modelo,
          marca,
          numeroSerie,
          sucursalId,
          tipoPruebas,
          ultimoMantenimiento: ultimoMantenimiento ? new Date(ultimoMantenimiento) : null,
          proximoMantenimiento: proximoMantenimiento ? new Date(proximoMantenimiento) : null
        }
      });

      const response: ApiResponse<Maquinaria> = {
        success: true,
        data: maquinaria,
        message: 'Maquinaria creada exitosamente',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/maquinaria/:id
router.put('/:id', 
  authenticateToken, 
  requireRole(['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL']),
  auditLog('UPDATE', 'MAQUINARIA'),
  [
    body('nombre').optional().isLength({ min: 2 }),
    body('modelo').optional().isLength({ min: 1 }),
    body('marca').optional().isLength({ min: 1 }),
    body('numeroSerie').optional().isLength({ min: 1 }),
    body('sucursalId').optional().isUUID(),
    body('tipoPruebas').optional().isArray(),
    body('isActive').optional().isBoolean()
  ],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { nombre, modelo, marca, numeroSerie, sucursalId, tipoPruebas, isActive, ultimoMantenimiento, proximoMantenimiento } = req.body;

      const maquinaria = await prisma.maquinaria.findUnique({
        where: { id }
      });

      if (!maquinaria) {
        throw new CustomError('Maquinaria no encontrada', 404);
      }

      // Verificar sucursal si se proporciona
      if (sucursalId) {
        const sucursal = await prisma.sucursal.findUnique({
          where: { id: sucursalId }
        });

        if (!sucursal) {
          throw new CustomError('Sucursal no encontrada', 404);
        }
      }

      const updatedMaquinaria = await prisma.maquinaria.update({
        where: { id },
        data: {
          nombre,
          modelo,
          marca,
          numeroSerie,
          sucursalId,
          tipoPruebas,
          isActive,
          ultimoMantenimiento: ultimoMantenimiento ? new Date(ultimoMantenimiento) : undefined,
          proximoMantenimiento: proximoMantenimiento ? new Date(proximoMantenimiento) : undefined
        }
      });

      const response: ApiResponse<Maquinaria> = {
        success: true,
        data: updatedMaquinaria,
        message: 'Maquinaria actualizada exitosamente',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/maquinaria/:id
router.delete('/:id', 
  authenticateToken, 
  requireRole(['SUPER_ADMIN', 'RESPONSABLE_SANITARIO']),
  auditLog('DELETE', 'MAQUINARIA'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const maquinaria = await prisma.maquinaria.findUnique({
        where: { id }
      });

      if (!maquinaria) {
        throw new CustomError('Maquinaria no encontrada', 404);
      }

      await prisma.maquinaria.update({
        where: { id },
        data: { isActive: false }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Maquinaria desactivada exitosamente',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
