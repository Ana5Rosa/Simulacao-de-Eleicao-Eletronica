import { getSession } from '../../config/neo4j';

export interface CandidatoApurado {
  candidatoId: string;
  nome: string;
  numeroEleitoral: string;
  partido: string;
  cargo: string;
  totalVotos: number;
}

export class ResultadosRepository {
  async buscarStatusEleicao(eleicaoId: string): Promise<string | null> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (e:Eleicao {id: $eleicaoId}) RETURN e.status AS status`,
        { eleicaoId }
      );
      if (result.records.length === 0) return null;
      return result.records[0].get('status');
    } finally {
      await session.close();
    }
  }

  async buscarCargoDoCandidatoNaEleicao(
    candidatoId: string,
    eleicaoId: string
  ): Promise<string | null> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (c:Usuario:Candidato {id: $candidatoId})-[:PARTICIPA_DE]->(e:Eleicao {id: $eleicaoId})
         MATCH (c)-[:CONCORRE_A]->(cargo:Cargo)
         RETURN cargo.nome AS cargo`,
        { candidatoId, eleicaoId }
      );
      if (result.records.length === 0) return null;
      return result.records[0].get('cargo');
    } finally {
      await session.close();
    }
  }

  async contabilizarVotos(
    eleicaoId: string,
    filtroCargo?: string
  ): Promise<CandidatoApurado[]> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (e:Eleicao {id: $eleicaoId})
         MATCH (c:Usuario:Candidato)-[:PARTICIPA_DE]->(e)
         MATCH (c)-[:CONCORRE_A]->(cargo:Cargo)
         WHERE $filtroCargo IS NULL OR cargo.nome = $filtroCargo
         OPTIONAL MATCH (v:Voto)-[:PARA_CANDIDATO]->(c)
         WHERE (v)-[:NA_ELEICAO]->(e)
         RETURN cargo.nome AS cargo,
                c.id AS candidatoId,
                c.nome AS nome,
                c.numeroEleitoral AS numeroEleitoral,
                c.partido AS partido,
                count(v) AS totalVotos
         ORDER BY cargo.nome ASC, totalVotos DESC, c.nome ASC`,
        { eleicaoId, filtroCargo: filtroCargo ?? null }
      );

      return result.records.map((r) => {
        const rawVotos = r.get('totalVotos');
        const totalVotos =
          typeof rawVotos?.toNumber === 'function'
            ? rawVotos.toNumber()
            : Number(rawVotos || 0);

        return {
          cargo: r.get('cargo'),
          candidatoId: r.get('candidatoId'),
          nome: r.get('nome'),
          numeroEleitoral: r.get('numeroEleitoral'),
          partido: r.get('partido'),
          totalVotos,
        };
      });
    } finally {
      await session.close();
    }
  }
}