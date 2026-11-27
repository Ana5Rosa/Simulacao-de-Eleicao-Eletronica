import { erroNaoEncontrado, erroValidacao } from '../../shared/errors';
import { dataValida, horarioValido, objetoObrigatorio, texto, turnoValido } from '../../shared/validacao';
import { Eleicao, EleicoesRepository } from './eleicoes.repository';

export class EleicoesService {
  constructor(private eleicoesRepository = new EleicoesRepository()) {}

  async cadastrarEleicao(dados: {
    data: string;
    turno: string;
    horarioAbertura: string;
    horarioEncerramento: string;
  }): Promise<Eleicao> {
    const entrada = objetoObrigatorio(dados);
    const data = dataValida(entrada.data);
    const turno = turnoValido(entrada.turno);
    const horarioAbertura = horarioValido(entrada.horarioAbertura);
    const horarioEncerramento = horarioValido(entrada.horarioEncerramento);
    if (horarioEncerramento <= horarioAbertura) {
      throw erroValidacao('O encerramento deve ser posterior à abertura.');
    }
    return this.eleicoesRepository.criar({ data, turno, horarioAbertura, horarioEncerramento });
  }

  async listarEleicoes(): Promise<Eleicao[]> {
    return this.eleicoesRepository.listarTodas();
  }

  async consultarSituacao(id: string): Promise<Eleicao> {
    const eleicaoId = texto(id, 'id');
    const eleicao = await this.eleicoesRepository.buscarPorId(eleicaoId);
    if (!eleicao) {
      throw erroNaoEncontrado('Eleição não encontrada.');
    }
    return eleicao;
  }

  async abrirVotacao(id: string): Promise<Eleicao> {
    const eleicao = await this.consultarSituacao(id);
    if (eleicao.status !== 'AGENDADA') {
      throw erroValidacao(`Não é possível abrir uma eleição com situação ${eleicao.status}.`);
    }
    return this.eleicoesRepository.atualizarStatus(eleicao.id, 'ABERTA');
  }

  async encerrarVotacao(id: string): Promise<Eleicao> {
    const eleicao = await this.consultarSituacao(id);
    if (eleicao.status !== 'ABERTA') {
      throw erroValidacao(`Só é possível encerrar uma eleição ABERTA (situação atual: ${eleicao.status}).`);
    }
    return this.eleicoesRepository.atualizarStatus(eleicao.id, 'ENCERRADA');
  }
}
