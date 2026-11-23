import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRepository } from './auth.repository';

export class AuthService {
  constructor(private authRepository = new AuthRepository()) {}

  async login(email: string, senha: string) {
    if (!email || !senha) {
      throw new Error('E-mail e senha são obrigatórios.');
    }

    const usuario = await this.authRepository.buscarPorEmail(email);
    if (!usuario) {
      throw new Error('Credenciais inválidas.');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      throw new Error('Credenciais inválidas.');
    }

    const secret = process.env.JWT_SECRET || 'chave_secreta_eleicao_2026';
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        perfil: usuario.perfil,
      },
      secret,
      { expiresIn: '8h' }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    };
  }
}