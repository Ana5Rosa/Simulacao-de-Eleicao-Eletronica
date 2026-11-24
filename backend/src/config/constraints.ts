import { getSession } from './neo4j';

// O servidor só aceita requisições após garantir as restrições de integridade.
export async function criarConstraints(): Promise<void> {
  const session = getSession();
  try {
    const comandos = [
      'CREATE CONSTRAINT usuario_id_unico IF NOT EXISTS FOR (u:Usuario) REQUIRE u.id IS UNIQUE',
      'CREATE CONSTRAINT usuario_email_unico IF NOT EXISTS FOR (u:Usuario) REQUIRE u.email IS UNIQUE',
      'CREATE CONSTRAINT eleicao_id_unico IF NOT EXISTS FOR (e:Eleicao) REQUIRE e.id IS UNIQUE',
      'CREATE CONSTRAINT cargo_nome_unico IF NOT EXISTS FOR (c:Cargo) REQUIRE c.nome IS UNIQUE',
      'CREATE CONSTRAINT voto_id_unico IF NOT EXISTS FOR (v:Voto) REQUIRE v.id IS UNIQUE',
      'CREATE CONSTRAINT participacao_unica IF NOT EXISTS FOR (p:RegistroParticipacao) REQUIRE p.chaveUnica IS UNIQUE',
    ];
    for (const comando of comandos) await session.run(comando);
  } finally { await session.close(); }
}
