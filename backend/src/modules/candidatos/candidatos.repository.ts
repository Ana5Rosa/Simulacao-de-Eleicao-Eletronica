import { randomUUID } from 'crypto';
import { ManagedTransaction } from 'neo4j-driver';
import { exigirEleicoesAgendadas } from '../../shared/transacoes';
import { getSession } from '../../config/neo4j';

export interface Candidato {
  id: string;
  nome: string;
  email: string;
  numeroEleitoral: string;
  partido: string;
  cargo: string;
  eleicaoId: string;
}

export class CandidatosRepository {
  private async verificarNumero(tx: ManagedTransaction, eleicaoId: string, numeroEleitoral: string, ignorarId: string | null = null) {
    const result = await tx.run(`MATCH (c:Candidato {numeroEleitoral: $numeroEleitoral})-[:PARTICIPA_DE]->(:Eleicao {id: $eleicaoId})
      WHERE $ignorarId IS NULL OR c.id <> $ignorarId RETURN c.id AS id`, { eleicaoId, numeroEleitoral, ignorarId });
    if (result.records.length) throw new Error('Já existe um candidato com este número eleitoral nesta eleição.');
  }

  private async bloquearCandidato(tx: ManagedTransaction, id: string) {
    const lock = await tx.run(`MATCH (c:Usuario:Candidato {id: $id}) SET c._lock = true REMOVE c._lock RETURN c.id AS id`, { id });
    if (!lock.records.length) throw new Error('Candidato não encontrado.');
    const r = await tx.run(`MATCH (c:Usuario:Candidato {id: $id})-[:PARTICIPA_DE]->(e:Eleicao)
      MATCH (c)-[:CONCORRE_A]->(cargo:Cargo)
      RETURN e.id AS eleicaoId, cargo.nome AS cargo, c.numeroEleitoral AS numeroEleitoral`, { id });
    if (r.records.length !== 1) throw new Error('Relacionamentos do candidato inválidos.');
    return r.records[0];
  }

  async criar(dados: {
    nome: string;
    email: string;
    senhaHash: string;
    numeroEleitoral: string;
    partido: string;
    cargo: string;
    eleicaoId: string;
  }): Promise<Candidato> {
    const session = getSession();
    try {
      return await session.executeWrite(async tx => {
        await exigirEleicoesAgendadas(tx, [dados.eleicaoId]);
        await this.verificarNumero(tx, dados.eleicaoId, dados.numeroEleitoral);
        const id = randomUUID();
        const result = await tx.run(
          `MATCH (cargo:Cargo {nome: $cargo})
           MATCH (eleicao:Eleicao {id: $eleicaoId})
           CREATE (c:Usuario:Candidato {
             id: $id,
             nome: $nome,
             email: $email,
             senhaHash: $senhaHash,
             numeroEleitoral: $numeroEleitoral,
             partido: $partido
           })
           CREATE (c)-[:CONCORRE_A]->(cargo)
           CREATE (c)-[:PARTICIPA_DE]->(eleicao)
           RETURN c.id AS id, c.nome AS nome, c.email AS email,
                  c.numeroEleitoral AS numeroEleitoral, c.partido AS partido,
                  cargo.nome AS cargo, eleicao.id AS eleicaoId`,
          { id, ...dados }
        );
        if (result.records.length !== 1) throw new Error('Cargo inválido.');
        const r = result.records[0];
        return {
          id: r.get('id'),
          nome: r.get('nome'),
          email: r.get('email'),
          numeroEleitoral: r.get('numeroEleitoral'),
          partido: r.get('partido'),
          cargo: r.get('cargo'),
          eleicaoId: r.get('eleicaoId'),
        };
      });
    } finally {
      await session.close();
    }
  }

  async listar(filtros?: { eleicaoId?: string; cargo?: string }): Promise<Candidato[]> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (c:Usuario:Candidato)-[:CONCORRE_A]->(cargo:Cargo)
         MATCH (c)-[:PARTICIPA_DE]->(eleicao:Eleicao)
         WHERE ($eleicaoId IS NULL OR eleicao.id = $eleicaoId)
           AND ($cargo IS NULL OR cargo.nome = $cargo)
         RETURN c.id AS id, c.nome AS nome, c.email AS email,
                c.numeroEleitoral AS numeroEleitoral, c.partido AS partido,
                cargo.nome AS cargo, eleicao.id AS eleicaoId
         ORDER BY cargo.nome ASC, c.numeroEleitoral ASC`,
        {
          eleicaoId: filtros?.eleicaoId ?? null,
          cargo: filtros?.cargo ?? null,
        }
      );
      return result.records.map((r) => ({
        id: r.get('id'),
        nome: r.get('nome'),
        email: r.get('email'),
        numeroEleitoral: r.get('numeroEleitoral'),
        partido: r.get('partido'),
        cargo: r.get('cargo'),
        eleicaoId: r.get('eleicaoId'),
      }));
    } finally {
      await session.close();
    }
  }

  async buscarPorId(id: string): Promise<Candidato | null> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (c:Usuario:Candidato {id: $id})-[:CONCORRE_A]->(cargo:Cargo)
         MATCH (c)-[:PARTICIPA_DE]->(eleicao:Eleicao)
         RETURN c.id AS id, c.nome AS nome, c.email AS email,
                c.numeroEleitoral AS numeroEleitoral, c.partido AS partido,
                cargo.nome AS cargo, eleicao.id AS eleicaoId`,
        { id }
      );
      if (result.records.length === 0) return null;
      const r = result.records[0];
      return {
        id: r.get('id'),
        nome: r.get('nome'),
        email: r.get('email'),
        numeroEleitoral: r.get('numeroEleitoral'),
        partido: r.get('partido'),
        cargo: r.get('cargo'),
        eleicaoId: r.get('eleicaoId'),
      };
    } finally {
      await session.close();
    }
  }

  async atualizar(
    id: string,
    dados: {
      nome?: string;
      email?: string;
      senhaHash?: string;
      numeroEleitoral?: string;
      partido?: string;
      cargo?: string;
      eleicaoId?: string;
    }
  ): Promise<Candidato> {
    const session = getSession();
    try {
      return await session.executeWrite(async tx => {
        const atual = await this.bloquearCandidato(tx, id);
        const eleicaoAtual: string = atual.get('eleicaoId');
        const eleicaoId = dados.eleicaoId ?? eleicaoAtual;
        const cargo = dados.cargo ?? atual.get('cargo');
        const numeroEleitoral = dados.numeroEleitoral ?? atual.get('numeroEleitoral');
        await exigirEleicoesAgendadas(tx, [eleicaoAtual, eleicaoId]);
        await this.verificarNumero(tx, eleicaoId, numeroEleitoral, id);
        const result = await tx.run(`MATCH (c:Usuario:Candidato {id: $id})-[rc:CONCORRE_A]->(:Cargo)
          MATCH (c)-[re:PARTICIPA_DE]->(:Eleicao)
          MATCH (cargo:Cargo {nome: $cargo})
          MATCH (eleicao:Eleicao {id: $eleicaoId})
          DELETE rc, re
          CREATE (c)-[:CONCORRE_A]->(cargo)
          CREATE (c)-[:PARTICIPA_DE]->(eleicao)
          SET c.nome = coalesce($nome, c.nome), c.email = coalesce($email, c.email),
              c.senhaHash = coalesce($senhaHash, c.senhaHash), c.numeroEleitoral = $numeroEleitoral,
              c.partido = coalesce($partido, c.partido)
          RETURN c.id AS id, c.nome AS nome, c.email AS email,
                 c.numeroEleitoral AS numeroEleitoral, c.partido AS partido,
                 cargo.nome AS cargo, eleicao.id AS eleicaoId`, {
          id, eleicaoId, cargo, numeroEleitoral,
          nome: dados.nome ?? null, email: dados.email ?? null,
          senhaHash: dados.senhaHash ?? null, partido: dados.partido ?? null,
        });
        if (result.records.length !== 1) throw new Error('Cargo inválido.');
        const r = result.records[0];
        return { id: r.get('id'), nome: r.get('nome'), email: r.get('email'),
          numeroEleitoral: r.get('numeroEleitoral'), partido: r.get('partido'),
          cargo: r.get('cargo'), eleicaoId: r.get('eleicaoId') };
      });
    } finally { await session.close(); }
  }

  async excluir(id: string): Promise<void> {
    const session = getSession();
    try {
      await session.executeWrite(async tx => {
        const atual = await this.bloquearCandidato(tx, id);
        await exigirEleicoesAgendadas(tx, [atual.get('eleicaoId')]);
        const votos = await tx.run(`MATCH (:Voto)-[:PARA_CANDIDATO]->(c:Candidato {id: $id}) RETURN count(*) AS total`, { id });
        if (Number(votos.records[0].get('total').toString()) > 0) throw new Error('Candidato já possui votos.');
        await tx.run(`MATCH (c:Usuario:Candidato {id: $id}) DETACH DELETE c`, { id });
      });
    } finally { await session.close(); }
  }
}
