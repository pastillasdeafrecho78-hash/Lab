import { Request, Response } from 'express';
import { ApiResponse } from '../types';

export const notFound = (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: `Ruta ${req.originalUrl} no encontrada`,
    timestamp: new Date().toISOString()
  };

  res.status(404).json(response);
};
