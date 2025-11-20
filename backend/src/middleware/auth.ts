import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { CustomError } from './errorHandler';

const prisma = new PrismaClient();

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new CustomError('Token de acceso requerido', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verificar que el usuario existe y está activo
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        sucursalesAsignadas: {
          include: {
            sucursal: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      throw new CustomError('Usuario no válido o inactivo', 401);
    }

    // Agregar información del usuario a la request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      sucursales: user.sucursalesAsignadas.map(su => su.sucursalId)
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('No autenticado', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new CustomError('Permisos insuficientes', 403));
    }

    next();
  };
};

export const requireSucursal = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new CustomError('No autenticado', 401));
  }

  const sucursalId = req.params.sucursalId || req.body.sucursalId;
  
  if (sucursalId && !req.user.sucursales.includes(sucursalId)) {
    return next(new CustomError('No tienes acceso a esta sucursal', 403));
  }

  next();
};
