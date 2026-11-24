import { texto, emailValido, senhaValida } from '../../shared/validacao';
import bcrypt from 'bcryptjs';
import { Eleitor, EleitoresRepository } from './eleitores.repository';

export class EleitoresService {
  constructor(private eleitoresRepository = new EleitoresRepository()) {}

  async cadastrarEleitor(dados: {
    nome: string;
    email: string;
    senha: string;
    tituloEleitor?: string;
  }): Promise<Eleitor> {
    const nome = texto(dados.nome, 'Nome');
    const email = emailValido(dados.email);
    const senhaHash = await bcrypt.hash(senhaValida(dados.senha), 10);
    const tituloEleitor = dados.tituloEleitor === undefined ? undefined : texto(dados.tituloEleitor, 'Título de eleitor');
    try {
      return await this.eleitoresRepository.criar({
        nome, email, senhaHash, tituloEleitor,
      });
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
        throw new Error('Já existe um utilizador registado com este e-mail.');
      }
      throw error;
    }
  }

  async listarEleitores(): Promise<Eleitor[]> {
    return this.eleitoresRepository.listarTodos();
  }

  async consultarEleitor(id: string): Promise<Eleitor> {
    const eleitor = await this.eleitoresRepository.buscarPorId(id);
    if (!eleitor) throw new Error('Eleitor não encontrado.');
    return eleitor;
  }

  async alterarEleitor(
    id: string,
    dados: { nome?: string; email?: string; senha?: string; tituloEleitor?: string }
  ): Promise<Eleitor> {
    await this.consultarEleitor(id);
    const senhaHash = dados.senha === undefined ? undefined : await bcrypt.hash(senhaValida(dados.senha), 10);
    try {
      return await this.eleitoresRepository.atualizar(id, {
        nome: dados.nome === undefined ? undefined : texto(dados.nome, 'Nome'),
        email: dados.email === undefined ? undefined : emailValido(dados.email),
        senhaHash,
        tituloEleitor: dados.tituloEleitor === undefined ? undefined : texto(dados.tituloEleitor, 'Título de eleitor'),
      });
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
        throw new Error('Já existe um utilizador registado com este e-mail.');
      }
      throw error;
    }
  }

  async excluirEleitor(id: string): Promise<void> {
    await this.consultarEleitor(id);
    await this.eleitoresRepository.excluir(id);
  }
}