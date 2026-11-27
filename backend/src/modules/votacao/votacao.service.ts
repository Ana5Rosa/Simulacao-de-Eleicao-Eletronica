import { CARGOS_OFICIAIS, objetoObrigatorio, texto } from '../../shared/validacao';
import { VotacaoRepository } from './votacao.repository';

export class VotacaoService {
  constructor(private votacaoRepository = new VotacaoRepository()) {}

  async confirmarVoto(dados: { eleitorId: string; eleicaoId: string; candidatoId: string }) {
    const entrada = objetoObrigatorio(dados);
    const voto = await this.votacaoRepository.registrarVotoSigiloso({
      eleitorId: texto(entrada.eleitorId, 'eleitorId'),
      eleicaoId: texto(entrada.eleicaoId, 'eleicaoId'),
      candidatoId: texto(entrada.candidatoId, 'candidatoId'),
    });
    return { mensagem: 'Voto confirmado com sucesso!', cargo: voto.cargo };
  }

  async consultarCargosVotados(eleitorId: string, eleicaoId: string) {
    const idEleitor = texto(eleitorId, 'eleitorId');
    const idEleicao = texto(eleicaoId, 'eleicaoId');
    const cargosVotados = await this.votacaoRepository.listarCargosJaVotados(idEleitor, idEleicao);
    const cargosPendentes = CARGOS_OFICIAIS.filter((cargo) => !cargosVotados.includes(cargo));
    return { eleicaoId: idEleicao, cargosVotados, cargosPendentes };
  }
}
