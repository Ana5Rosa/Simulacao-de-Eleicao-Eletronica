import { randomUUID } from 'crypto';
import { getSession } from '../../config/neo4j';
import { bloquearEleicao } from '../../shared/transacoes';

export type StatusEleicao = 'AGENDADA' | 'ABERTA' | 'ENCERRADA';

export interface Eleicao {
  id: string;
  data: string;
  turno: string;
  horarioAbertura: string;
  horarioEncerramento: string;
  status: StatusEleicao;
}

export class EleicoesRepository {
  async criar(dados: Omit<Eleicao, 'id' | 'status'>): Promise<Eleicao> {
    const session = getSession();
    try {
      const id = randomUUID();
      const status: StatusEleicao = 'AGENDADA';

      const result = await session.run(
        `CREATE (e:Eleicao {
           id: $id,
           data: $data,
           turno: $turno,
           horarioAbertura: $horarioAbertura,
           horarioEncerramento: $horarioEncerramento,
           status: $status
         })
         RETURN e`,
        { id, ...dados, status }
      );

      return result.records[0].get('e').properties as Eleicao;
    } finally {
      await session.close();
    }
  }

  async listarTodas(): Promise<Eleicao[]> {
    const session = getSession();
    try {
      const result = await session.run(`MATCH (e:Eleicao) RETURN e ORDER BY e.data DESC`);
      return result.records.map((r) => r.get('e').properties as Eleicao);
    } finally {
      await session.close();
    }
  }

  async buscarPorId(id: string): Promise<Eleicao | null> {
    const session = getSession();
    try {
      const result = await session.run(`MATCH (e:Eleicao {id: $id}) RETURN e`, { id });
      if (result.records.length === 0) return null;
      return result.records[0].get('e').properties as Eleicao;
    } finally {
      await session.close();
    }
  }

  async atualizarStatus(id: string, novoStatus: StatusEleicao): Promise<Eleicao> {
    const session = getSession();
    try {
      return await session.executeWrite(async tx => {
        const status = await bloquearEleicao(tx, id);
        if (!((status === 'AGENDADA' && novoStatus === 'ABERTA') ||
              (status === 'ABERTA' && novoStatus === 'ENCERRADA'))) {
          throw new Error(`Transição de situação inválida: ${status} -> ${novoStatus}.`);
        }
        const result = await tx.run(`MATCH (e:Eleicao {id: $id})
          SET e.status = $novoStatus RETURN e`, { id, novoStatus });
        return result.records[0].get('e').properties as Eleicao;
      });
    } finally {
      await session.close();
    }
  }
}