import { VotacaoRepository } from './votacao.repository';
import { texto } from '../../shared/validacao';

export class VotacaoService {
  constructor(private votacaoRepository = new VotacaoRepository()) {}

  async confirmarVoto(dados: { eleitorId: string; eleicaoId: string; candidatoId: string }) {
    const voto = await this.votacaoRepository.registrarVotoSigiloso({
      eleitorId: texto(dados.eleitorId, 'eleitorId'),
      eleicaoId: texto(dados.eleicaoId, 'eleicaoId'),
      candidatoId: texto(dados.candidatoId, 'candidatoId'),
    });
    return { mensagem: 'Voto confirmado com sucesso!', cargo: voto.cargo };
  }

  async consultarCargosVotados(eleitorId: string, eleicaoId: string) {
    const cargosVotados = await this.votacaoRepository.listarCargosJaVotados(eleitorId, eleicaoId);
    return { eleicaoId, cargosVotados };
  }
}
