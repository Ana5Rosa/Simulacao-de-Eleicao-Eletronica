import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { obterSegredoJWT } from '../../config/env';
import { getSession } from '../../config/neo4j';

export type PerfilUsuario = 'ChefeSecao' | 'Eleitor' | 'Candidato';
export interface TokenPayload { id: string; email: string; nome: string; perfil: PerfilUsuario; }
declare global { namespace Express { interface Request { usuario?: TokenPayload; } } }

export const autenticarJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ erro: 'Token de autenticação não fornecido.' });
    return;
  }
  let decoded: TokenPayload;
  try {
    const payload = jwt.verify(authHeader.slice(7), obterSegredoJWT(), { algorithms: ['HS256'] });
    if (typeof payload !== 'object' || typeof payload.id !== 'string' ||
        !['ChefeSecao', 'Eleitor', 'Candidato'].includes(payload.perfil)) throw new Error('Token inválido.');
    decoded = payload as TokenPayload;
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado.' });
    return;
  }
  // Tokens emitidos antes da exclusão não autorizam novos acessos.
  try {
    const session = getSession();
    try {
      const result = await session.run(`MATCH (u:Usuario {id: $id})
        WHERE coalesce(u.ativo, true) AND $perfil IN labels(u)
        RETURN u.id AS id, u.nome AS nome, u.email AS email`, { id: decoded.id, perfil: decoded.perfil });
      if (result.records.length !== 1) {
        res.status(401).json({ erro: 'Usuário não cadastrado ou inativo.' });
        return;
      }
      const u = result.records[0];
      req.usuario = { id: u.get('id'), nome: u.get('nome'), email: u.get('email'), perfil: decoded.perfil };
    } finally { await session.close(); }
  } catch {
    res.status(503).json({ erro: 'Não foi possível verificar o usuário no banco de dados.' });
    return;
  }
  next();
};

export const exigirPerfil = (...perfisPermitidos: PerfilUsuario[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario || !perfisPermitidos.includes(req.usuario.perfil)) {
      res.status(403).json({ erro: `Acesso negado. Perfil autorizado: ${perfisPermitidos.join(' ou ')}.` });
      return;
    }
    next();
  };
};
