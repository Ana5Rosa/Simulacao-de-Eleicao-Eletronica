import { VotacaoRepository } from './votacao.repository';

export class VotacaoService {
  constructor(private votacaoRepository = new VotacaoRepository()) {}

  async confirmarVoto(dados: {
    eleitorId: string;
    eleicaoId: string;
    candidatoId: string;
  }) {
    if (!dados.eleicaoId || !dados.candidatoId) {
      throw new Error('Os campos eleicaoId e candidatoId são obrigatórios.');
    }

    const info = await this.votacaoRepository.buscarDadosParaVoto(
      dados.eleicaoId,
      dados.candidatoId
    );

    if (!info) {
      throw new Error('Eleição ou candidato inválido para esta eleição.');
    }

    if (info.statusEleicao !== 'ABERTA') {
      throw new Error(
        `Votação não permitida. A eleição está atualmente ${info.statusEleicao}.`
      );
    }

    try {
      const comprovante = await this.votacaoRepository.registrarVotoSigiloso({
        eleitorId: dados.eleitorId,
        eleicaoId: dados.eleicaoId,
        candidatoId: dados.candidatoId,
        cargo: info.cargoCandidato,
      });

      return {
        mensagem: 'Voto confirmado com sucesso! O sigilo do seu voto foi preservado.',
        cargo: comprovante.cargo,
        protocolo: comprovante.protocoloVoto,
      };
    } catch (error: any) {
      if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
        throw new Error(
          `Você já registrou e confirmou seu voto para o cargo de ${info.cargoCandidato} nesta eleição.`
        );
      }
      throw error;
    }
  }

  async consultarCargosVotados(eleitorId: string, eleicaoId: string) {
    const cargosVotados = await this.votacaoRepository.listarCargosJaVotados(
      eleitorId,
      eleicaoId
    );
    return { eleicaoId, cargosVotados };
  }
}