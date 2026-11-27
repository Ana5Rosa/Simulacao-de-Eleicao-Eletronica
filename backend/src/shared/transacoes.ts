import { ManagedTransaction } from 'neo4j-driver';
import { erroNaoEncontrado, erroValidacao } from './errors';

// Propriedade temporária: o lock de escrita permanece até commit/rollback.
// https://neo4j.com/docs/operations-manual/current/database-internals/concurrent-data-access/
export async function bloquearEleicao(tx: ManagedTransaction, id: string): Promise<string> {
  const r = await tx.run(`MATCH (e:Eleicao {id: $id})
    SET e._lock = true REMOVE e._lock
    RETURN e.status AS status`, { id });
  if (!r.records.length) throw erroNaoEncontrado('Eleição não encontrada.');
  return r.records[0].get('status');
}

export async function exigirEleicoesAgendadas(tx: ManagedTransaction, ids: string[]): Promise<void> {
  // Ordem estável quando um candidato é movido entre duas eleições.
  for (const id of [...new Set(ids)].sort()) {
    if (await bloquearEleicao(tx, id) !== 'AGENDADA') {
      throw erroValidacao('Só é possível modificar candidatos em eleições AGENDADAS.');
    }
  }
}
