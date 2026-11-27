import bcrypt from 'bcryptjs';
import { erroConflito, erroNaoEncontrado } from '../../shared/errors';
import {
  emailValido,
  exigirAlgumCampoAtualizacao,
  objetoObrigatorio,
  senhaValida,
  texto,
  tituloEleitorValido,
} from '../../shared/validacao';
import { Eleitor, EleitoresRepository } from './eleitores.repository';

export class EleitoresService {
  constructor(private eleitoresRepository = new EleitoresRepository()) {}

  async cadastrarEleitor(dados: {
    nome: string;
    email: string;
    senha: string;
    tituloEleitor?: string;
  }): Promise<Eleitor> {
    const entrada = objetoObrigatorio(dados);
    const nome = texto(entrada.nome, 'Nome');
    const email = emailValido(entrada.email);
    const senhaHash = await bcrypt.hash(senhaValida(entrada.senha), 10);
    const tituloEleitor =
      entrada.tituloEleitor === undefined ? undefined : tituloEleitorValido(entrada.tituloEleitor);
    try {
      return await this.eleitoresRepository.criar({
        nome,
        email,
        senhaHash,
        tituloEleitor,
      });
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
        throw erroConflito('Já existe um usuário cadastrado com este e-mail.');
      }
      throw error;
    }
  }

  async listarEleitores(): Promise<Eleitor[]> {
    return this.eleitoresRepository.listarTodos();
  }

  async consultarEleitor(id: string): Promise<Eleitor> {
    const eleitorId = texto(id, 'id');
    const eleitor = await this.eleitoresRepository.buscarPorId(eleitorId);
    if (!eleitor) throw erroNaoEncontrado('Eleitor não encontrado.');
    return eleitor;
  }

  async alterarEleitor(
    id: string,
    dados: { nome?: string; email?: string; senha?: string; tituloEleitor?: string }
  ): Promise<Eleitor> {
    const eleitorId = texto(id, 'id');
    const entrada = objetoObrigatorio(dados);
    const alteracoes = {
      nome: entrada.nome === undefined ? undefined : texto(entrada.nome, 'Nome'),
      email: entrada.email === undefined ? undefined : emailValido(entrada.email),
      senhaHash:
        entrada.senha === undefined ? undefined : await bcrypt.hash(senhaValida(entrada.senha), 10),
      tituloEleitor:
        entrada.tituloEleitor === undefined ? undefined : tituloEleitorValido(entrada.tituloEleitor),
    };
    exigirAlgumCampoAtualizacao(alteracoes);

    await this.consultarEleitor(eleitorId);
    try {
      return await this.eleitoresRepository.atualizar(eleitorId, alteracoes);
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
        throw erroConflito('Já existe um usuário cadastrado com este e-mail.');
      }
      throw error;
    }
  }

  async excluirEleitor(id: string): Promise<void> {
    const eleitorId = texto(id, 'id');
    await this.consultarEleitor(eleitorId);
    await this.eleitoresRepository.excluir(eleitorId);
  }
}
