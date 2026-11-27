import { randomUUID } from 'crypto';
import { getSession } from '../../config/neo4j';
import { erroNaoEncontrado, erroValidacao } from '../../shared/errors';
import { bloquearEleicao } from '../../shared/transacoes';

export class VotacaoRepository {
  async registrarVotoSigiloso(dados: {
    eleitorId: string;
    eleicaoId: string;
    candidatoId: string;
  }): Promise<{ cargo: string }> {
    const session = getSession();
    try {
      return await session.executeWrite(async (tx) => {
        // A mesma trava é usada para abrir, encerrar e modificar candidatos.
        const status = await bloquearEleicao(tx, dados.eleicaoId);
        if (status !== 'ABERTA') {
          throw erroValidacao(`Votação não permitida. A eleição está atualmente ${status}.`);
        }
        const eleitor = await tx.run(
          `MATCH (u:Usuario:Eleitor {id: $eleitorId})
           SET u._lock = true REMOVE u._lock
           RETURN coalesce(u.ativo, true) AS ativo`,
          { eleitorId: dados.eleitorId }
        );
        if (!eleitor.records.length || !eleitor.records[0].get('ativo')) {
          throw erroValidacao('Eleitor não cadastrado ou inativo.');
        }
        const candidato = await tx.run(
          `MATCH (c:Usuario:Candidato {id: $candidatoId})-[:PARTICIPA_DE]->(e:Eleicao {id: $eleicaoId})
           MATCH (c)-[:CONCORRE_A]->(cargo:Cargo) RETURN cargo.nome AS cargo`,
          dados
        );
        if (candidato.records.length !== 1) {
          throw erroValidacao('Candidato inválido para esta eleição.');
        }
        const cargo: string = candidato.records[0].get('cargo');
        const chaveUnica = `${dados.eleitorId}_${dados.eleicaoId}_${cargo}`;
        const existente = await tx.run(
          `MATCH (p:RegistroParticipacao {chaveUnica: $chaveUnica}) RETURN p`,
          { chaveUnica }
        );
        if (existente.records.length) {
          throw erroValidacao(
            `Você já registrou e confirmou seu voto para o cargo de ${cargo} nesta eleição.`
          );
        }
        // Sem data/hora individual, identificador compartilhado ou ligação ao eleitor.
        await tx.run(`CREATE (:RegistroParticipacao {chaveUnica: $chaveUnica})`, { chaveUnica });
        const resultado = await tx.run(
          `MATCH (c:Usuario:Candidato {id: $candidatoId})-[:PARTICIPA_DE]->(e:Eleicao {id: $eleicaoId})
           CREATE (v:Voto {id: $votoId})
           CREATE (v)-[:PARA_CANDIDATO]->(c)
           CREATE (v)-[:NA_ELEICAO]->(e)
           RETURN v.id AS id`,
          { candidatoId: dados.candidatoId, eleicaoId: dados.eleicaoId, votoId: randomUUID() }
        );
        if (resultado.records.length !== 1) {
          throw new Error('Não foi possível registrar o voto.');
        }
        return { cargo };
      });
    } finally {
      await session.close();
    }
  }

  async listarCargosJaVotados(eleitorId: string, eleicaoId: string): Promise<string[]> {
    const session = getSession();
    try {
      const prefixo = `${eleitorId}_${eleicaoId}_`;
      const result = await session.run(
        `MATCH (e:Eleicao {id: $eleicaoId})
         OPTIONAL MATCH (p:RegistroParticipacao)
         WHERE p.chaveUnica STARTS WITH $prefixo
         RETURN e.id AS eleicaoId, collect(p.chaveUnica) AS chaves`,
        { eleicaoId, prefixo }
      );
      if (result.records.length === 0) {
        throw erroNaoEncontrado('Eleição não encontrada.');
      }
      const chaves = (result.records[0].get('chaves') as string[]) ?? [];
      return chaves.map((chave) => chave.slice(prefixo.length));
    } finally {
      await session.close();
    }
  }
}
