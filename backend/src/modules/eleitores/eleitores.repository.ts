import { randomUUID } from 'crypto';
import { ManagedTransaction } from 'neo4j-driver';
import { getSession } from '../../config/neo4j';
import { erroConflito, erroNaoEncontrado } from '../../shared/errors';

export interface Eleitor {
  id: string;
  nome: string;
  email: string;
  tituloEleitor?: string;
}

export class EleitoresRepository {
  private async verificarTitulo(
    tx: ManagedTransaction,
    tituloEleitor?: string,
    ignorarId: string | null = null
  ): Promise<void> {
    if (!tituloEleitor) return;
    const result = await tx.run(
      `MATCH (e:Usuario:Eleitor {tituloEleitor: $tituloEleitor})
       WHERE coalesce(e.ativo, true) AND ($ignorarId IS NULL OR e.id <> $ignorarId)
       RETURN e.id AS id`,
      { tituloEleitor, ignorarId }
    );
    if (result.records.length > 0) {
      throw erroConflito('Já existe um eleitor cadastrado com este título de eleitor.');
    }
  }

  async criar(dados: {
    nome: string;
    email: string;
    senhaHash: string;
    tituloEleitor?: string;
  }): Promise<Eleitor> {
    const session = getSession();
    try {
      return await session.executeWrite(async (tx) => {
        await this.verificarTitulo(tx, dados.tituloEleitor);
        const id = randomUUID();
        const result = await tx.run(
          `CREATE (e:Usuario:Eleitor {
             id: $id,
             nome: $nome,
             email: $email,
             senhaHash: $senhaHash,
             tituloEleitor: $tituloEleitor,
             ativo: true
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
        if (!result.records.length) throw erroNaoEncontrado('Eleitor não encontrado.');
        const r = result.records[0];
        return {
          id: r.get('id'),
          nome: r.get('nome'),
          email: r.get('email'),
          tituloEleitor: r.get('tituloEleitor'),
        };
      });
    } finally {
      await session.close();
    }
  }

  async listarTodos(): Promise<Eleitor[]> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (e:Usuario:Eleitor)
         WHERE coalesce(e.ativo, true)
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
         WHERE coalesce(e.ativo, true)
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
      return await session.executeWrite(async (tx) => {
        await this.verificarTitulo(tx, dados.tituloEleitor, id);
        const result = await tx.run(
          `MATCH (e:Usuario:Eleitor {id: $id})
           SET e._lock = true REMOVE e._lock
           WITH e WHERE coalesce(e.ativo, true)
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
        if (!result.records.length) throw erroNaoEncontrado('Eleitor não encontrado.');
        const r = result.records[0];
        return {
          id: r.get('id'),
          nome: r.get('nome'),
          email: r.get('email'),
          tituloEleitor: r.get('tituloEleitor'),
        };
      });
    } finally {
      await session.close();
    }
  }

  async excluir(id: string): Promise<void> {
    const session = getSession();
    try {
      await session.executeWrite(async (tx) => {
        const result = await tx.run(
          `MATCH (e:Usuario:Eleitor {id: $id})
           SET e._lock = true REMOVE e._lock
           WITH e WHERE coalesce(e.ativo, true)
           SET e.ativo = false REMOVE e.senhaHash RETURN e.id AS id`,
          { id }
        );
        if (!result.records.length) throw erroNaoEncontrado('Eleitor não encontrado.');
      });
    } finally {
      await session.close();
    }
  }
}
