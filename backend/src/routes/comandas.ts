import { Router } from 'express';
import { body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, requireSucursal } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { CustomError } from '../middleware/errorHandler';
import { ApiResponse, PaginatedResponse, Comanda, EstadoComanda, TipoPrueba } from '../types';

const router = Router();
const prisma = new PrismaClient();

// GET /api/comandas
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const estado = req.query.estado as string;
    const sucursalId = req.query.sucursalId as string;

    const where: any = {};
    if (estado) where.estado = estado;
    if (sucursalId) where.sucursalId = sucursalId;

    const [comandas, total] = await Promise.all([
      prisma.comanda.findMany({
        where,
        skip,
        take: limit,
        include: {
          cliente: true,
          sucursal: true,
          responsable: true,
          tecnico: true,
          resultados: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.comanda.count({ where })
    ]);

    const response: PaginatedResponse<Comanda> = {
      success: true,
      data: comandas.map(comanda => ({
        id: comanda.id,
        numeroComanda: comanda.numeroComanda,
        clienteId: comanda.clienteId,
        sucursalId: comanda.sucursalId,
        tipoPrueba: comanda.tipoPrueba,
        elementos: comanda.elementos,
        estado: comanda.estado,
        fechaCreacion: comanda.fechaCreacion,
        fechaAsignacion: comanda.fechaAsignacion,
        fechaCompletado: comanda.fechaCompletado,
        observaciones: comanda.observaciones,
        responsableId: comanda.responsableId,
        tecnicoId: comanda.tecnicoId,
        createdAt: comanda.createdAt,
        updatedAt: comanda.updatedAt
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

// GET /api/comandas/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const comanda = await prisma.comanda.findUnique({
      where: { id },
      include: {
        cliente: true,
        sucursal: true,
        responsable: true,
        tecnico: true,
        resultados: true
      }
    });

    if (!comanda) {
      throw new CustomError('Comanda no encontrada', 404);
    }

    const response: ApiResponse<Comanda> = {
      success: true,
      data: {
        id: comanda.id,
        numeroComanda: comanda.numeroComanda,
        clienteId: comanda.clienteId,
        sucursalId: comanda.sucursalId,
        tipoPrueba: comanda.tipoPrueba,
        elementos: comanda.elementos,
        estado: comanda.estado,
        fechaCreacion: comanda.fechaCreacion,
        fechaAsignacion: comanda.fechaAsignacion,
        fechaCompletado: comanda.fechaCompletado,
        observaciones: comanda.observaciones,
        responsableId: comanda.responsableId,
        tecnicoId: comanda.tecnicoId,
        createdAt: comanda.createdAt,
        updatedAt: comanda.updatedAt
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/comandas
router.post('/', 
  authenticateToken, 
  requireRole(['RECEPCION', 'RESPONSABLE_SUCURSAL', 'RESPONSABLE_SANITARIO']),
  auditLog('CREATE', 'COMANDA'),
  [
    body('clienteId').isUUID(),
    body('sucursalId').isUUID(),
    body('tipoPrueba').isIn(Object.values(TipoPrueba)),
    body('elementos').isArray(),
    body('observaciones').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const { clienteId, sucursalId, tipoPrueba, elementos, observaciones } = req.body;

      // Verificar que el cliente existe
      const cliente = await prisma.cliente.findUnique({
        where: { id: clienteId }
      });

      if (!cliente) {
        throw new CustomError('Cliente no encontrado', 404);
      }

      // Verificar que la sucursal existe
      const sucursal = await prisma.sucursal.findUnique({
        where: { id: sucursalId }
      });

      if (!sucursal) {
        throw new CustomError('Sucursal no encontrada', 404);
      }

      // Generar número de comanda único
      const numeroComanda = `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const comanda = await prisma.comanda.create({
        data: {
          numeroComanda,
          clienteId,
          sucursalId,
          tipoPrueba,
          elementos,
          observaciones,
          responsableId: req.user!.id
        },
        include: {
          cliente: true,
          sucursal: true,
          responsable: true
        }
      });

      const response: ApiResponse<Comanda> = {
        success: true,
        data: {
          id: comanda.id,
          numeroComanda: comanda.numeroComanda,
          clienteId: comanda.clienteId,
          sucursalId: comanda.sucursalId,
          tipoPrueba: comanda.tipoPrueba,
          elementos: comanda.elementos,
          estado: comanda.estado,
          fechaCreacion: comanda.fechaCreacion,
          fechaAsignacion: comanda.fechaAsignacion,
          fechaCompletado: comanda.fechaCompletado,
          observaciones: comanda.observaciones,
          responsableId: comanda.responsableId,
          tecnicoId: comanda.tecnicoId,
          createdAt: comanda.createdAt,
          updatedAt: comanda.updatedAt
        },
        message: 'Comanda creada exitosamente',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/comandas/:id/estado
router.put('/:id/estado', 
  authenticateToken, 
  requireRole(['TECNICO_LABORATORIO', 'RESPONSABLE_SUCURSAL', 'RESPONSABLE_SANITARIO']),
  auditLog('UPDATE', 'COMANDA'),
  [
    body('estado').isIn(Object.values(EstadoComanda)),
    body('tecnicoId').optional().isUUID()
  ],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { estado, tecnicoId } = req.body;

      const comanda = await prisma.comanda.findUnique({
        where: { id }
      });

      if (!comanda) {
        throw new CustomError('Comanda no encontrada', 404);
      }

      const updateData: any = { estado };
      
      if (estado === EstadoComanda.ASIGNADA && !comanda.fechaAsignacion) {
        updateData.fechaAsignacion = new Date();
        updateData.tecnicoId = tecnicoId || req.user!.id;
      }
      
      if (estado === EstadoComanda.COMPLETADA && !comanda.fechaCompletado) {
        updateData.fechaCompletado = new Date();
      }

      const updatedComanda = await prisma.comanda.update({
        where: { id },
        data: updateData,
        include: {
          cliente: true,
          sucursal: true,
          responsable: true,
          tecnico: true
        }
      });

      const response: ApiResponse<Comanda> = {
        success: true,
        data: {
          id: updatedComanda.id,
          numeroComanda: updatedComanda.numeroComanda,
          clienteId: updatedComanda.clienteId,
          sucursalId: updatedComanda.sucursalId,
          tipoPrueba: updatedComanda.tipoPrueba,
          elementos: updatedComanda.elementos,
          estado: updatedComanda.estado,
          fechaCreacion: updatedComanda.fechaCreacion,
          fechaAsignacion: updatedComanda.fechaAsignacion,
          fechaCompletado: updatedComanda.fechaCompletado,
          observaciones: updatedComanda.observaciones,
          responsableId: updatedComanda.responsableId,
          tecnicoId: updatedComanda.tecnicoId,
          createdAt: updatedComanda.createdAt,
          updatedAt: updatedComanda.updatedAt
        },
        message: 'Estado de comanda actualizado exitosamente',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
