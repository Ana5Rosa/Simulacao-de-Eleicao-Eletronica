import { TokenPayload } from '../../shared/middlewares/authMiddleware';
import { CandidatoApurado, ResultadosRepository } from './resultados.repository';

export class ResultadosService {
  constructor(private resultadosRepository = new ResultadosRepository()) {}

  async acompanharVotacao(eleicaoId: string, usuario: TokenPayload) {
    const status = await this.resultadosRepository.buscarStatusEleicao(eleicaoId);
    if (!status) {
      throw new Error('Eleição não encontrada.');
    }

    if (status === 'AGENDADA') {
      throw new Error('O acompanhamento só fica disponível após a abertura da eleição.');
    }

    let filtroCargo: string | undefined = undefined;

    // Regra de negócio: Candidato visualiza exclusivamente o cargo ao qual concorre
    if (usuario.perfil === 'Candidato') {
      const cargoCandidato = await this.resultadosRepository.buscarCargoDoCandidatoNaEleicao(
        usuario.id,
        eleicaoId
      );
      if (!cargoCandidato) {
        throw new Error('Você não está concorrendo a nenhum cargo nesta eleição.');
      }
      filtroCargo = cargoCandidato;
    }

    const lista = await this.resultadosRepository.contabilizarVotos(eleicaoId, filtroCargo);
    const porCargo = this.agruparPorCargo(lista);

    return {
      eleicaoId,
      situacao: status,
      restritoAoCargo: filtroCargo ?? null,
      resultados: porCargo,
    };
  }

  async consultarResultadoFinal(eleicaoId: string) {
    const status = await this.resultadosRepository.buscarStatusEleicao(eleicaoId);
    if (!status) {
      throw new Error('Eleição não encontrada.');
    }

    if (status !== 'ENCERRADA') {
      throw new Error(
        `O resultado final só pode ser consultado após o encerramento da votação (situação atual: ${status}).`
      );
    }

    const lista = await this.resultadosRepository.contabilizarVotos(eleicaoId);
    const agrupado = this.agruparPorCargo(lista);

    const resultadoFinal = agrupado.map((grupo) => {
      const maiorVotacao = grupo.candidatos.length > 0 ? grupo.candidatos[0].totalVotos : 0;
      const maisVotados =
        maiorVotacao > 0
          ? grupo.candidatos.filter((c) => c.totalVotos === maiorVotacao)
          : [];

      return {
        cargo: grupo.cargo,
        maisVotado: maisVotados.length === 1 ? maisVotados[0] : maisVotados,
        candidatos: grupo.candidatos,
      };
    });

    return {
      eleicaoId,
      situacao: status,
      resultadoFinal,
    };
  }

  private agruparPorCargo(lista: CandidatoApurado[]) {
    const mapa = new Map<string, CandidatoApurado[]>();
    for (const item of lista) {
      if (!mapa.has(item.cargo)) {
        mapa.set(item.cargo, []);
      }
      mapa.get(item.cargo)!.push(item);
    }

    return Array.from(mapa.entries()).map(([cargo, candidatos]) => ({
      cargo,
      candidatos: candidatos.sort((a, b) => b.totalVotos - a.totalVotos || a.nome.localeCompare(b.nome)),
    }));
  }
}