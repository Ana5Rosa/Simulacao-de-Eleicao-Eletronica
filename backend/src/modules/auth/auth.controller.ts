import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { responderErro } from '../../shared/errors';
import { objetoObrigatorio } from '../../shared/validacao';

export class AuthController {
  constructor(private authService = new AuthService()) {}

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, senha } = objetoObrigatorio(req.body);
      const resultado = await this.authService.login(email as string, senha as string);
      res.status(200).json(resultado);
    } catch (error: unknown) {
      responderErro(res, error, 401);
    }
  };
}
