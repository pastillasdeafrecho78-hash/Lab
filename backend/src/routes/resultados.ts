import { Router } from 'express';
import { body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { CustomError } from '../middleware/errorHandler';
import { ApiResponse, PaginatedResponse, Resultado } from '../types';

const router = Router();
const prisma = new PrismaClient();

// GET /api/resultados
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const comandaId = req.query.comandaId as string;

    const where = comandaId ? { comandaId } : {};

    const [resultados, total] = await Promise.all([
      prisma.resultado.findMany({
        where,
        skip,
        take: limit,
        include: {
          comanda: {
            include: {
              cliente: true,
              sucursal: true
            }
          },
          tecnico: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.resultado.count({ where })
    ]);

    const response: PaginatedResponse<Resultado> = {
      success: true,
      data: resultados.map(resultado => ({
        id: resultado.id,
        comandaId: resultado.comandaId,
        elemento: resultado.elemento,
        valor: resultado.valor,
        unidad: resultado.unidad,
        rangoNormal: {
          min: resultado.rangoNormalMin,
          max: resultado.rangoNormalMax
        },
        esNormal: resultado.esNormal,
        observaciones: resultado.observaciones,
        tecnicoId: resultado.tecnicoId,
        fechaResultado: resultado.fechaResultado,
        createdAt: resultado.createdAt,
        updatedAt: resultado.updatedAt
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

// GET /api/resultados/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const resultado = await prisma.resultado.findUnique({
      where: { id },
      include: {
        comanda: {
          include: {
            cliente: true,
            sucursal: true
          }
        },
        tecnico: true
      }
    });

    if (!resultado) {
      throw new CustomError('Resultado no encontrado', 404);
    }

    const response: ApiResponse<Resultado> = {
      success: true,
      data: {
        id: resultado.id,
        comandaId: resultado.comandaId,
        elemento: resultado.elemento,
        valor: resultado.valor,
        unidad: resultado.unidad,
        rangoNormal: {
          min: resultado.rangoNormalMin,
          max: resultado.rangoNormalMax
        },
        esNormal: resultado.esNormal,
        observaciones: resultado.observaciones,
        tecnicoId: resultado.tecnicoId,
        fechaResultado: resultado.fechaResultado,
        createdAt: resultado.createdAt,
        updatedAt: resultado.updatedAt
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/resultados
router.post('/', 
  authenticateToken, 
  requireRole(['TECNICO_LABORATORIO', 'RESPONSABLE_SUCURSAL', 'RESPONSABLE_SANITARIO']),
  auditLog('CREATE', 'RESULTADO'),
  [
    body('comandaId').isUUID(),
    body('elemento').isLength({ min: 1 }),
    body('valor').isNumeric(),
    body('unidad').isLength({ min: 1 }),
    body('rangoNormalMin').isNumeric(),
    body('rangoNormalMax').isNumeric(),
    body('observaciones').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const { comandaId, elemento, valor, unidad, rangoNormalMin, rangoNormalMax, observaciones } = req.body;

      // Verificar que la comanda existe
      const comanda = await prisma.comanda.findUnique({
        where: { id: comandaId }
      });

      if (!comanda) {
        throw new CustomError('Comanda no encontrada', 404);
      }

      // Verificar que el usuario tiene acceso a la sucursal de la comanda
      if (!req.user!.sucursales.includes(comanda.sucursalId)) {
        throw new CustomError('No tienes acceso a esta sucursal', 403);
      }

      // Determinar si el valor está en rango normal
      const esNormal = valor >= rangoNormalMin && valor <= rangoNormalMax;

      const resultado = await prisma.resultado.create({
        data: {
          comandaId,
          elemento,
          valor,
          unidad,
          rangoNormalMin,
          rangoNormalMax,
          esNormal,
          observaciones,
          tecnicoId: req.user!.id
        }
      });

      const response: ApiResponse<Resultado> = {
        success: true,
        data: {
          id: resultado.id,
          comandaId: resultado.comandaId,
          elemento: resultado.elemento,
          valor: resultado.valor,
          unidad: resultado.unidad,
          rangoNormal: {
            min: resultado.rangoNormalMin,
            max: resultado.rangoNormalMax
          },
          esNormal: resultado.esNormal,
          observaciones: resultado.observaciones,
          tecnicoId: resultado.tecnicoId,
          fechaResultado: resultado.fechaResultado,
          createdAt: resultado.createdAt,
          updatedAt: resultado.updatedAt
        },
        message: 'Resultado creado exitosamente',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/resultados/batch
router.post('/batch', 
  authenticateToken, 
  requireRole(['TECNICO_LABORATORIO', 'RESPONSABLE_SUCURSAL', 'RESPONSABLE_SANITARIO']),
  auditLog('CREATE', 'RESULTADO'),
  [
    body('comandaId').isUUID(),
    body('resultados').isArray(),
    body('resultados.*.elemento').isLength({ min: 1 }),
    body('resultados.*.valor').isNumeric(),
    body('resultados.*.unidad').isLength({ min: 1 }),
    body('resultados.*.rangoNormalMin').isNumeric(),
    body('resultados.*.rangoNormalMax').isNumeric()
  ],
  async (req, res, next) => {
    try {
      const { comandaId, resultados } = req.body;

      // Verificar que la comanda existe
      const comanda = await prisma.comanda.findUnique({
        where: { id: comandaId }
      });

      if (!comanda) {
        throw new CustomError('Comanda no encontrada', 404);
      }

      // Verificar que el usuario tiene acceso a la sucursal de la comanda
      if (!req.user!.sucursales.includes(comanda.sucursalId)) {
        throw new CustomError('No tienes acceso a esta sucursal', 403);
      }

      // Crear resultados en lote
      const resultadosData = resultados.map((resultado: any) => ({
        comandaId,
        elemento: resultado.elemento,
        valor: resultado.valor,
        unidad: resultado.unidad,
        rangoNormalMin: resultado.rangoNormalMin,
        rangoNormalMax: resultado.rangoNormalMax,
        esNormal: resultado.valor >= resultado.rangoNormalMin && resultado.valor <= resultado.rangoNormalMax,
        observaciones: resultado.observaciones,
        tecnicoId: req.user!.id
      }));

      const createdResultados = await prisma.resultado.createMany({
        data: resultadosData
      });

      // Actualizar estado de la comanda a completada
      await prisma.comanda.update({
        where: { id: comandaId },
        data: { 
          estado: 'COMPLETADA',
          fechaCompletado: new Date()
        }
      });

      const response: ApiResponse = {
        success: true,
        data: { count: createdResultados.count },
        message: `${createdResultados.count} resultados creados exitosamente`,
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
