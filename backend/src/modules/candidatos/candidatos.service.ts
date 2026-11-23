import bcrypt from 'bcryptjs';
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
    if (
      !dados.nome ||
      !dados.email ||
      !dados.senha ||
      !dados.numeroEleitoral ||
      !dados.partido ||
      !dados.cargo ||
      !dados.eleicaoId
    ) {
      throw new Error(
        'Nome, e-mail, senha, número eleitoral, partido, cargo e eleicaoId são obrigatórios.'
      );
    }

    const cargoValido = await this.candidatosRepository.cargoExiste(dados.cargo);
    if (!cargoValido) {
      throw new Error(
        'Cargo inválido. Escolha entre: Deputado Estadual, Deputado Federal, Senador, Governador ou Presidente da República.'
      );
    }

    const eleicaoValida = await this.candidatosRepository.eleicaoExiste(dados.eleicaoId);
    if (!eleicaoValida) {
      throw new Error('Eleição não encontrada.');
    }

    const numeroDuplicado = await this.candidatosRepository.numeroJaExisteNaEleicao(
      dados.eleicaoId,
      String(dados.numeroEleitoral)
    );
    if (numeroDuplicado) {
      throw new Error('Já existe um candidato com este número eleitoral nesta eleição.');
    }

    const senhaHash = await bcrypt.hash(dados.senha, 10);
    try {
      return await this.candidatosRepository.criar({
        nome: dados.nome,
        email: dados.email,
        senhaHash,
        numeroEleitoral: String(dados.numeroEleitoral),
        partido: dados.partido,
        cargo: dados.cargo,
        eleicaoId: dados.eleicaoId,
      });
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
        throw new Error('Já existe um utilizador registado com este e-mail.');
      }
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
    const atual = await this.consultarCandidato(id);

    if (dados.cargo) {
      const cargoValido = await this.candidatosRepository.cargoExiste(dados.cargo);
      if (!cargoValido) throw new Error('Cargo inválido.');
    }

    const eleicaoAlvo = dados.eleicaoId || atual.eleicaoId;
    if (dados.eleicaoId) {
      const eleicaoValida = await this.candidatosRepository.eleicaoExiste(dados.eleicaoId);
      if (!eleicaoValida) throw new Error('Eleição não encontrada.');
    }

    const numeroAlvo = dados.numeroEleitoral ? String(dados.numeroEleitoral) : atual.numeroEleitoral;
    const numeroDuplicado = await this.candidatosRepository.numeroJaExisteNaEleicao(
      eleicaoAlvo,
      numeroAlvo,
      id
    );
    if (numeroDuplicado) {
      throw new Error('Já existe outro candidato com este número eleitoral nesta eleição.');
    }

    const senhaHash = dados.senha ? await bcrypt.hash(dados.senha, 10) : undefined;
    return this.candidatosRepository.atualizar(id, {
      ...dados,
      numeroEleitoral: dados.numeroEleitoral ? String(dados.numeroEleitoral) : undefined,
      senhaHash,
    });
  }

  async excluirCandidato(id: string): Promise<void> {
    await this.consultarCandidato(id);
    await this.candidatosRepository.excluir(id);
  }
}