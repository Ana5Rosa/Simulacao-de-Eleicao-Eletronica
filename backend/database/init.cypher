// ============================================================================
// 1. RESTRIÇÕES DE INTEGRIDADE (CONSTRAINTS)
// ============================================================================

CREATE CONSTRAINT usuario_id_unico IF NOT EXISTS
FOR (u:Usuario) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT usuario_email_unico IF NOT EXISTS
FOR (u:Usuario) REQUIRE u.email IS UNIQUE;

CREATE CONSTRAINT eleicao_id_unico IF NOT EXISTS
FOR (e:Eleicao) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT cargo_nome_unico IF NOT EXISTS
FOR (c:Cargo) REQUIRE c.nome IS UNIQUE;

CREATE CONSTRAINT voto_id_unico IF NOT EXISTS
FOR (v:Voto) REQUIRE v.id IS UNIQUE;

CREATE CONSTRAINT participacao_unica IF NOT EXISTS
FOR (p:RegistroParticipacao) REQUIRE p.chaveUnica IS UNIQUE;

// ============================================================================
// 2. CARGA INICIAL DOS CARGOS OFICIAIS (5 NÓS :Cargo)
// ============================================================================

UNWIND [
  'Deputado Estadual',
  'Deputado Federal',
  'Senador',
  'Governador',
  'Presidente da República'
] AS nomeCargo
MERGE (:Cargo {nome: nomeCargo});

// ============================================================================
// 3. USUÁRIO ADMINISTRADOR INICIAL (1 NÓ :Usuario:ChefeSecao)
// ============================================================================

MERGE (c:Usuario:ChefeSecao {email: 'chefe@eleicao.gov.br'})
ON CREATE SET
  c.id = randomUUID(),
  c.nome = 'Chefe da Seção Principal',
  c.senhaHash = 'PENDENTE_HASH_BACKEND';