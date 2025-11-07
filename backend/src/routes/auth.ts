import { Router } from 'express';
import { body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CustomError } from '../middleware/errorHandler';
import { ApiResponse, User } from '../types';

const router = Router();
const prisma = new PrismaClient();

// Validation middleware
const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
];

const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('nombre').isLength({ min: 2 }),
  body('apellido').isLength({ min: 2 }),
  body('role').isIn(['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'TECNICO_LABORATORIO', 'RECEPCION'])
];

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        sucursalesAsignadas: {
          include: {
            sucursal: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      throw new CustomError('Credenciales inválidas', 401);
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new CustomError('Credenciales inválidas', 401);
    }

    // Generar JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        usuarioId: user.id,
        accion: 'LOGIN',
        entidad: 'USER',
        entidadId: user.id,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      }
    });

    const response: ApiResponse<{ user: Partial<User>, token: string }> = {
      success: true,
      data: {
        user: {
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
        token
      },
      message: 'Inicio de sesión exitoso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/register
router.post('/register', validateRegister, async (req, res, next) => {
  try {
    const { email, password, nombre, apellido, telefono, role, sucursales } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new CustomError('El usuario ya existe', 400);
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nombre,
        apellido,
        telefono,
        role
      },
      include: {
        sucursalesAsignadas: {
          include: {
            sucursal: true
          }
        }
      }
    });

    // Asignar sucursales si se proporcionan
    if (sucursales && sucursales.length > 0) {
      await prisma.sucursalUser.createMany({
        data: sucursales.map((sucursalId: string) => ({
          sucursalId,
          userId: user.id
        }))
      });
    }

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        usuarioId: user.id,
        accion: 'CREATE',
        entidad: 'USER',
        entidadId: user.id,
        datosNuevos: { email, nombre, apellido, role },
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      }
    });

    const response: ApiResponse<{ user: Partial<User> }> = {
      success: true,
      data: {
        user: {
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
        }
      },
      message: 'Usuario creado exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    // En un sistema más robusto, aquí invalidarías el token
    // Por ahora, solo devolvemos éxito
    const response: ApiResponse = {
      success: true,
      message: 'Sesión cerrada exitosamente',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new CustomError('Token requerido', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
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
      throw new CustomError('Usuario no válido', 401);
    }

    const response: ApiResponse<{ user: Partial<User> }> = {
      success: true,
      data: {
        user: {
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
        }
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
