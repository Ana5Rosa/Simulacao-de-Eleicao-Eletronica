import { randomUUID } from 'crypto';
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
  async cargoExiste(nomeCargo: string): Promise<boolean> {
    const session = getSession();
    try {
      const result = await session.run(`MATCH (c:Cargo {nome: $nomeCargo}) RETURN c`, { nomeCargo });
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  async eleicaoExiste(eleicaoId: string): Promise<boolean> {
    const session = getSession();
    try {
      const result = await session.run(`MATCH (e:Eleicao {id: $eleicaoId}) RETURN e`, { eleicaoId });
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  async numeroJaExisteNaEleicao(
    eleicaoId: string,
    numeroEleitoral: string,
    ignorarCandidatoId?: string
  ): Promise<boolean> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (c:Candidato {numeroEleitoral: $numeroEleitoral})-[:PARTICIPA_DE]->(e:Eleicao {id: $eleicaoId})
         WHERE $ignorarId IS NULL OR c.id <> $ignorarId
         RETURN c`,
        { eleicaoId, numeroEleitoral, ignorarId: ignorarCandidatoId ?? null }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
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
      const id = randomUUID();
      const result = await session.run(
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
      if (dados.cargo) {
        await session.run(
          `MATCH (c:Usuario:Candidato {id: $id})-[r:CONCORRE_A]->(:Cargo)
           MATCH (novoCargo:Cargo {nome: $cargo})
           DELETE r
           CREATE (c)-[:CONCORRE_A]->(novoCargo)`,
          { id, cargo: dados.cargo }
        );
      }

      if (dados.eleicaoId) {
        await session.run(
          `MATCH (c:Usuario:Candidato {id: $id})-[r:PARTICIPA_DE]->(:Eleicao)
           MATCH (novaEleicao:Eleicao {id: $eleicaoId})
           DELETE r
           CREATE (c)-[:PARTICIPA_DE]->(novaEleicao)`,
          { id, eleicaoId: dados.eleicaoId }
        );
      }

      const result = await session.run(
        `MATCH (c:Usuario:Candidato {id: $id})-[:CONCORRE_A]->(cargo:Cargo)
         MATCH (c)-[:PARTICIPA_DE]->(eleicao:Eleicao)
         SET c.nome = COALESCE($nome, c.nome),
             c.email = COALESCE($email, c.email),
             c.senhaHash = COALESCE($senhaHash, c.senhaHash),
             c.numeroEleitoral = COALESCE($numeroEleitoral, c.numeroEleitoral),
             c.partido = COALESCE($partido, c.partido)
         RETURN c.id AS id, c.nome AS nome, c.email AS email,
                c.numeroEleitoral AS numeroEleitoral, c.partido AS partido,
                cargo.nome AS cargo, eleicao.id AS eleicaoId`,
        {
          id,
          nome: dados.nome ?? null,
          email: dados.email ?? null,
          senhaHash: dados.senhaHash ?? null,
          numeroEleitoral: dados.numeroEleitoral ?? null,
          partido: dados.partido ?? null,
        }
      );
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

  async excluir(id: string): Promise<void> {
    const session = getSession();
    try {
      await session.run(`MATCH (c:Usuario:Candidato {id: $id}) DETACH DELETE c`, { id });
    } finally {
      await session.close();
    }
  }
}