import { randomUUID } from 'crypto';
import { getSession } from '../../config/neo4j';

export interface Eleitor {
  id: string;
  nome: string;
  email: string;
  tituloEleitor?: string;
}

export class EleitoresRepository {
  async criar(dados: {
    nome: string;
    email: string;
    senhaHash: string;
    tituloEleitor?: string;
  }): Promise<Eleitor> {
    const session = getSession();
    try {
      const id = randomUUID();
      const result = await session.run(
        `CREATE (e:Usuario:Eleitor {
           id: $id,
           nome: $nome,
           email: $email,
           senhaHash: $senhaHash,
           tituloEleitor: $tituloEleitor
         })
         RETURN e.id AS id, e.nome AS nome, e.email AS email, e.tituloEleitor AS tituloEleitor`,
        {
          id,
          nome: dados.nome,
          email: dados.email,
          senhaHash: dados.senhaHash,
          tituloEleitor: dados.tituloEleitor || '',
        }
      );
      const r = result.records[0];
      return {
        id: r.get('id'),
        nome: r.get('nome'),
        email: r.get('email'),
        tituloEleitor: r.get('tituloEleitor'),
      };
    } finally {
      await session.close();
    }
  }

  async listarTodos(): Promise<Eleitor[]> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (e:Usuario:Eleitor)
         RETURN e.id AS id, e.nome AS nome, e.email AS email, e.tituloEleitor AS tituloEleitor
         ORDER BY e.nome ASC`
      );
      return result.records.map((r) => ({
        id: r.get('id'),
        nome: r.get('nome'),
        email: r.get('email'),
        tituloEleitor: r.get('tituloEleitor'),
      }));
    } finally {
      await session.close();
    }
  }

  async buscarPorId(id: string): Promise<Eleitor | null> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (e:Usuario:Eleitor {id: $id})
         RETURN e.id AS id, e.nome AS nome, e.email AS email, e.tituloEleitor AS tituloEleitor`,
        { id }
      );
      if (result.records.length === 0) return null;
      const r = result.records[0];
      return {
        id: r.get('id'),
        nome: r.get('nome'),
        email: r.get('email'),
        tituloEleitor: r.get('tituloEleitor'),
      };
    } finally {
      await session.close();
    }
  }

  async atualizar(
    id: string,
    dados: { nome?: string; email?: string; senhaHash?: string; tituloEleitor?: string }
  ): Promise<Eleitor> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (e:Usuario:Eleitor {id: $id})
         SET e.nome = COALESCE($nome, e.nome),
             e.email = COALESCE($email, e.email),
             e.senhaHash = COALESCE($senhaHash, e.senhaHash),
             e.tituloEleitor = COALESCE($tituloEleitor, e.tituloEleitor)
         RETURN e.id AS id, e.nome AS nome, e.email AS email, e.tituloEleitor AS tituloEleitor`,
        {
          id,
          nome: dados.nome ?? null,
          email: dados.email ?? null,
          senhaHash: dados.senhaHash ?? null,
          tituloEleitor: dados.tituloEleitor ?? null,
        }
      );
      const r = result.records[0];
      return {
        id: r.get('id'),
        nome: r.get('nome'),
        email: r.get('email'),
        tituloEleitor: r.get('tituloEleitor'),
      };
    } finally {
      await session.close();
    }
  }

  async excluir(id: string): Promise<void> {
    const session = getSession();
    try {
      await session.run(`MATCH (e:Usuario:Eleitor {id: $id}) DETACH DELETE e`, { id });
    } finally {
      await session.close();
    }
  }
}