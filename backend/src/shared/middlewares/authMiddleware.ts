import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type PerfilUsuario = 'ChefeSecao' | 'Eleitor' | 'Candidato';

export interface TokenPayload {
  id: string;
  email: string;
  nome: string;
  perfil: PerfilUsuario;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: TokenPayload;
    }
  }
}

export const autenticarJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ erro: 'Token de autenticação não fornecido.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'chave_secreta_eleicao_2026';

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    req.usuario = decoded;
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
};

export const exigirPerfil = (...perfisPermitidos: PerfilUsuario[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario || !perfisPermitidos.includes(req.usuario.perfil)) {
      res.status(403).json({
        erro: `Acesso negado. Perfil autorizado: ${perfisPermitidos.join(' ou ')}.`,
      });
      return;
    }
    next();
  };
};