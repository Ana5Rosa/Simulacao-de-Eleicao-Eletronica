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
    if (!dados.nome || !dados.email || !dados.senha) {
      throw new Error('Nome, e-mail e senha são obrigatórios para cadastrar um eleitor.');
    }
    const senhaHash = await bcrypt.hash(dados.senha, 10);
    try {
      return await this.eleitoresRepository.criar({
        nome: dados.nome,
        email: dados.email,
        senhaHash,
        tituloEleitor: dados.tituloEleitor,
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
    const senhaHash = dados.senha ? await bcrypt.hash(dados.senha, 10) : undefined;
    try {
      return await this.eleitoresRepository.atualizar(id, {
        nome: dados.nome,
        email: dados.email,
        senhaHash,
        tituloEleitor: dados.tituloEleitor,
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