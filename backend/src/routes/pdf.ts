import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { CustomError } from '../middleware/errorHandler';
import { pdfService } from '../services/pdfService';

const router = Router();
const prisma = new PrismaClient();

// GET /api/pdf/comanda/:id
router.get('/comanda/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const comanda = await prisma.comanda.findUnique({
      where: { id },
      include: {
        cliente: true,
        sucursal: true
      }
    });

    if (!comanda) {
      throw new CustomError('Comanda no encontrada', 404);
    }

    // Verificar permisos
    if (!req.user!.sucursales.includes(comanda.sucursalId)) {
      throw new CustomError('No tienes acceso a esta comanda', 403);
    }

    const pdfBuffer = await pdfService.generateComandaPDF(
      comanda as any,
      comanda.cliente as any,
      comanda.sucursal as any
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="comanda-${comanda.numeroComanda}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// GET /api/pdf/resultados/:id
router.get('/resultados/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const comanda = await prisma.comanda.findUnique({
      where: { id },
      include: {
        cliente: true,
        sucursal: true,
        resultados: true
      }
    });

    if (!comanda) {
      throw new CustomError('Comanda no encontrada', 404);
    }

    // Verificar permisos
    if (!req.user!.sucursales.includes(comanda.sucursalId)) {
      throw new CustomError('No tienes acceso a esta comanda', 403);
    }

    if (!comanda.resultados || comanda.resultados.length === 0) {
      throw new CustomError('No hay resultados disponibles para esta comanda', 404);
    }

    const pdfBuffer = await pdfService.generateResultadoPDF(
      comanda as any,
      comanda.resultados as any,
      comanda.cliente as any,
      comanda.sucursal as any
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resultados-${comanda.numeroComanda}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// GET /api/pdf/resultados/:id/preview
router.get('/resultados/:id/preview', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const comanda = await prisma.comanda.findUnique({
      where: { id },
      include: {
        cliente: true,
        sucursal: true,
        resultados: true
      }
    });

    if (!comanda) {
      throw new CustomError('Comanda no encontrada', 404);
    }

    // Verificar permisos
    if (!req.user!.sucursales.includes(comanda.sucursalId)) {
      throw new CustomError('No tienes acceso a esta comanda', 403);
    }

    if (!comanda.resultados || comanda.resultados.length === 0) {
      throw new CustomError('No hay resultados disponibles para esta comanda', 404);
    }

    const pdfBuffer = await pdfService.generateResultadoPDF(
      comanda as any,
      comanda.resultados as any,
      comanda.cliente as any,
      comanda.sucursal as any
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="resultados-${comanda.numeroComanda}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
