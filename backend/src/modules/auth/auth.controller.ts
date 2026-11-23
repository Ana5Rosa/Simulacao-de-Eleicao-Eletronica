import { Request, Response } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  constructor(private authService = new AuthService()) {}

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, senha } = req.body;
      const resultado = await this.authService.login(email, senha);
      res.status(200).json(resultado);
    } catch (error: any) {
      res.status(401).json({ erro: error.message || 'Erro ao autenticar.' });
    }
  };
}