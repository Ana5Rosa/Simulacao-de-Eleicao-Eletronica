import { dataValida, horarioValido, turnoValido } from '../../shared/validacao';
import { Eleicao, EleicoesRepository } from './eleicoes.repository';

export class EleicoesService {
  constructor(private eleicoesRepository = new EleicoesRepository()) {}

  async cadastrarEleicao(dados: {
    data: string;
    turno: string;
    horarioAbertura: string;
    horarioEncerramento: string;
  }): Promise<Eleicao> {
    const data = dataValida(dados.data);
    const turno = turnoValido(dados.turno);
    const horarioAbertura = horarioValido(dados.horarioAbertura);
    const horarioEncerramento = horarioValido(dados.horarioEncerramento);
    if (horarioEncerramento <= horarioAbertura) throw new Error('O encerramento deve ser posterior à abertura.');
    return this.eleicoesRepository.criar({ data, turno, horarioAbertura, horarioEncerramento });
  }

  async listarEleicoes(): Promise<Eleicao[]> {
    return this.eleicoesRepository.listarTodas();
  }

  async consultarSituacao(id: string): Promise<Eleicao> {
    const eleicao = await this.eleicoesRepository.buscarPorId(id);
    if (!eleicao) {
      throw new Error('Eleição não encontrada.');
    }
    return eleicao;
  }

  async abrirVotacao(id: string): Promise<Eleicao> {
    const eleicao = await this.consultarSituacao(id);
    if (eleicao.status !== 'AGENDADA') {
      throw new Error(`Não é possível abrir uma eleição com situação ${eleicao.status}.`);
    }
    return this.eleicoesRepository.atualizarStatus(id, 'ABERTA');
  }

  async encerrarVotacao(id: string): Promise<Eleicao> {
    const eleicao = await this.consultarSituacao(id);
    if (eleicao.status !== 'ABERTA') {
      throw new Error(`Só é possível encerrar uma eleição ABERTA (situação atual: ${eleicao.status}).`);
    }
    return this.eleicoesRepository.atualizarStatus(id, 'ENCERRADA');
  }
}