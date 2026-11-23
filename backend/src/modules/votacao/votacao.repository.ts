import { randomUUID } from 'crypto';
import { getSession } from '../../config/neo4j';

export interface DadosValidacaoVoto {
  statusEleicao: string;
  cargoCandidato: string;
  nomeCandidato: string;
}

export class VotacaoRepository {
  async buscarDadosParaVoto(
    eleicaoId: string,
    candidatoId: string
  ): Promise<DadosValidacaoVoto | null> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (e:Eleicao {id: $eleicaoId})
         MATCH (c:Usuario:Candidato {id: $candidatoId})-[:PARTICIPA_DE]->(e)
         MATCH (c)-[:CONCORRE_A]->(cargo:Cargo)
         RETURN e.status AS statusEleicao, cargo.nome AS cargoCandidato, c.nome AS nomeCandidato`,
        { eleicaoId, candidatoId }
      );

      if (result.records.length === 0) return null;

      const r = result.records[0];
      return {
        statusEleicao: r.get('statusEleicao'),
        cargoCandidato: r.get('cargoCandidato'),
        nomeCandidato: r.get('nomeCandidato'),
      };
    } finally {
      await session.close();
    }
  }

  async registrarVotoSigiloso(dados: {
    eleitorId: string;
    eleicaoId: string;
    candidatoId: string;
    cargo: string;
  }): Promise<{ protocoloVoto: string; cargo: string }> {
    const session = getSession();
    try {
      const chaveUnica = `${dados.eleitorId}_${dados.eleicaoId}_${dados.cargo}`;
      const protocoloVoto = randomUUID();

      await session.executeWrite(async (tx) => {
        // 1. Trava anti-duplicidade isolada (sem vínculo com o voto)
        await tx.run(
          `CREATE (:RegistroParticipacao {
             chaveUnica: $chaveUnica,
             registradoEm: datetime()
           })`,
          { chaveUnica }
        );

        // 2. Voto anônimo ligado apenas ao candidato e à eleição
        await tx.run(
          `MATCH (c:Usuario:Candidato {id: $candidatoId})
           MATCH (e:Eleicao {id: $eleicaoId})
           CREATE (v:Voto {id: $protocoloVoto, confirmadoEm: datetime()})
           CREATE (v)-[:PARA_CANDIDATO]->(c)
           CREATE (v)-[:NA_ELEICAO]->(e)`,
          {
            candidatoId: dados.candidatoId,
            eleicaoId: dados.eleicaoId,
            protocoloVoto,
          }
        );
      });

      return { protocoloVoto, cargo: dados.cargo };
    } finally {
      await session.close();
    }
  }

  async listarCargosJaVotados(eleitorId: string, eleicaoId: string): Promise<string[]> {
    const session = getSession();
    try {
      const prefixo = `${eleitorId}_${eleicaoId}_`;
      const result = await session.run(
        `MATCH (p:RegistroParticipacao)
         WHERE p.chaveUnica STARTS WITH $prefixo
         RETURN p.chaveUnica AS chave`,
        { prefixo }
      );

      return result.records.map((r) => {
        const chave: string = r.get('chave');
        return chave.replace(prefixo, '');
      });
    } finally {
      await session.close();
    }
  }
}