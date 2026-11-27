import bcrypt from 'bcryptjs';
import { erroConflito, erroNaoEncontrado } from '../../shared/errors';
import {
  cargoValido,
  emailValido,
  exigirAlgumCampoAtualizacao,
  numeroEleitoralValido,
  objetoObrigatorio,
  senhaValida,
  texto,
} from '../../shared/validacao';
import { Candidato, CandidatosRepository } from './candidatos.repository';

export class CandidatosService {
  constructor(private candidatosRepository = new CandidatosRepository()) {}

  async cadastrarCandidato(dados: {
    nome: string;
    email: string;
    senha: string;
    numeroEleitoral: string;
    partido: string;
    cargo: string;
    eleicaoId: string;
  }): Promise<Candidato> {
    const entrada = objetoObrigatorio(dados);
    const nome = texto(entrada.nome, 'Nome');
    const email = emailValido(entrada.email);
    const numeroEleitoral = numeroEleitoralValido(entrada.numeroEleitoral);
    const partido = texto(entrada.partido, 'Partido');
    const cargo = cargoValido(entrada.cargo);
    const eleicaoId = texto(entrada.eleicaoId, 'eleicaoId');
    const senhaHash = await bcrypt.hash(senhaValida(entrada.senha), 10);
    try {
      return await this.candidatosRepository.criar({
        nome,
        email,
        senhaHash,
        numeroEleitoral,
        partido,
        cargo,
        eleicaoId,
      });
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
        throw erroConflito('Já existe um usuário cadastrado com este e-mail.');
      }
      throw error;
    }
  }

  async listarCandidatos(filtros?: { eleicaoId?: string; cargo?: string }): Promise<Candidato[]> {
    const eleicaoId =
      filtros?.eleicaoId === undefined ? undefined : texto(filtros.eleicaoId, 'eleicaoId');
    const cargo = filtros?.cargo === undefined ? undefined : cargoValido(filtros.cargo);
    return this.candidatosRepository.listar({ eleicaoId, cargo });
  }

  async consultarCandidato(id: string): Promise<Candidato> {
    const candidatoId = texto(id, 'id');
    const candidato = await this.candidatosRepository.buscarPorId(candidatoId);
    if (!candidato) throw erroNaoEncontrado('Candidato não encontrado.');
    return candidato;
  }

  async alterarCandidato(
    id: string,
    dados: {
      nome?: string;
      email?: string;
      senha?: string;
      numeroEleitoral?: string;
      partido?: string;
      cargo?: string;
      eleicaoId?: string;
    }
  ): Promise<Candidato> {
    const candidatoId = texto(id, 'id');
    const entrada = objetoObrigatorio(dados);
    const alteracoes = {
      nome: entrada.nome === undefined ? undefined : texto(entrada.nome, 'Nome'),
      email: entrada.email === undefined ? undefined : emailValido(entrada.email),
      senhaHash:
        entrada.senha === undefined ? undefined : await bcrypt.hash(senhaValida(entrada.senha), 10),
      numeroEleitoral:
        entrada.numeroEleitoral === undefined
          ? undefined
          : numeroEleitoralValido(entrada.numeroEleitoral),
      partido: entrada.partido === undefined ? undefined : texto(entrada.partido, 'Partido'),
      cargo: entrada.cargo === undefined ? undefined : cargoValido(entrada.cargo),
      eleicaoId: entrada.eleicaoId === undefined ? undefined : texto(entrada.eleicaoId, 'eleicaoId'),
    };
    exigirAlgumCampoAtualizacao(alteracoes);

    try {
      return await this.candidatosRepository.atualizar(candidatoId, alteracoes);
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
        throw erroConflito('Já existe um usuário cadastrado com este e-mail.');
      }
      throw error;
    }
  }

  async excluirCandidato(id: string): Promise<void> {
    const candidatoId = texto(id, 'id');
    await this.candidatosRepository.excluir(candidatoId);
  }
}
