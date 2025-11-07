import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

export const auditLog = (action: string, entity: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;

    // Interceptar la respuesta para obtener el ID de la entidad creada/modificada
    res.json = function(body: any) {
      // Log de auditoría
      if (req.user) {
        const entityId = req.params.id || body?.id || req.body?.id || 'unknown';
        
        prisma.auditLog.create({
          data: {
            usuarioId: req.user.id,
            accion: action,
            entidad: entity,
            entidadId: entityId,
            datosAnteriores: req.method === 'PUT' || req.method === 'PATCH' ? req.body : null,
            datosNuevos: req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' ? body : null,
            ip: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
          }
        }).catch(error => {
          console.error('Error creating audit log:', error);
        });
      }

      return originalJson.call(this, body);
    };

    res.send = function(body: any) {
      // Log de auditoría
      if (req.user) {
        const entityId = req.params.id || 'unknown';
        
        prisma.auditLog.create({
          data: {
            usuarioId: req.user.id,
            accion: action,
            entidad: entity,
            entidadId: entityId,
            datosAnteriores: req.method === 'PUT' || req.method === 'PATCH' ? req.body : null,
            datosNuevos: req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' ? body : null,
            ip: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
          }
        }).catch(error => {
          console.error('Error creating audit log:', error);
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
};
