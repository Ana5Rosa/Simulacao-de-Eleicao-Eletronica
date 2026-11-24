import bcrypt from 'bcryptjs';
import { Candidato, CandidatosRepository } from './candidatos.repository';
import { texto, emailValido, senhaValida, numeroEleitoralValido } from '../../shared/validacao';

export class CandidatosService {
  constructor(private candidatosRepository = new CandidatosRepository()) {}

  async cadastrarCandidato(dados: {
    nome: string; email: string; senha: string; numeroEleitoral: string;
    partido: string; cargo: string; eleicaoId: string;
  }): Promise<Candidato> {
    const nome = texto(dados.nome, 'Nome');
    const email = emailValido(dados.email);
    const numeroEleitoral = numeroEleitoralValido(dados.numeroEleitoral);
    const partido = texto(dados.partido, 'Partido');
    const cargo = texto(dados.cargo, 'Cargo');
    const eleicaoId = texto(dados.eleicaoId, 'eleicaoId');
    const senhaHash = await bcrypt.hash(senhaValida(dados.senha), 10);
    try {
      return await this.candidatosRepository.criar({ nome, email, senhaHash, numeroEleitoral, partido, cargo, eleicaoId });
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') throw new Error('Já existe um usuário cadastrado com este e-mail.');
      throw error;
    }
  }

  async listarCandidatos(filtros?: { eleicaoId?: string; cargo?: string }): Promise<Candidato[]> {
    return this.candidatosRepository.listar(filtros);
  }

  async consultarCandidato(id: string): Promise<Candidato> {
    const candidato = await this.candidatosRepository.buscarPorId(id);
    if (!candidato) throw new Error('Candidato não encontrado.');
    return candidato;
  }

  async alterarCandidato(id: string, dados: {
    nome?: string; email?: string; senha?: string; numeroEleitoral?: string;
    partido?: string; cargo?: string; eleicaoId?: string;
  }): Promise<Candidato> {
    const alteracoes = {
      nome: dados.nome === undefined ? undefined : texto(dados.nome, 'Nome'),
      email: dados.email === undefined ? undefined : emailValido(dados.email),
      senhaHash: dados.senha === undefined ? undefined : await bcrypt.hash(senhaValida(dados.senha), 10),
      numeroEleitoral: dados.numeroEleitoral === undefined ? undefined : numeroEleitoralValido(dados.numeroEleitoral),
      partido: dados.partido === undefined ? undefined : texto(dados.partido, 'Partido'),
      cargo: dados.cargo === undefined ? undefined : texto(dados.cargo, 'Cargo'),
      eleicaoId: dados.eleicaoId === undefined ? undefined : texto(dados.eleicaoId, 'eleicaoId'),
    };
    try {
      return await this.candidatosRepository.atualizar(id, alteracoes);
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') throw new Error('Já existe um usuário cadastrado com este e-mail.');
      throw error;
    }
  }

  async excluirCandidato(id: string): Promise<void> {
    await this.candidatosRepository.excluir(id);
  }
}
