import request from 'supertest';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import app from '../../src/app';
import { criarConstraints } from '../../src/config/constraints';
import { getSession, fecharConexaoNeo4j, verificarConexaoNeo4j } from '../../src/config/neo4j';

// Executar somente contra um banco de testes separado (ver CORRECOES.md).
const suite = process.env.RUN_NEO4J_TESTS === '1' ? describe : describe.skip;
suite('Integração HTTP + Neo4j real', () => {
  const prefixo = `teste-${randomUUID()}`;
  const email = (nome: string) => `${prefixo}-${nome}@example.com`;
  const senha = 'SenhaTeste123!';
  const eleicoes: string[] = [];
  const segredoAnterior = process.env.JWT_SECRET;
  const adminId = randomUUID();
  let tokenChefe: string;
  const bearer = (token: string) => `Bearer ${token}`;
  const login = async (nome: string) => (await request(app).post('/auth/login').send({ email: email(nome), senha }).expect(200)).body.token as string;
  const criarEleicao = async () => {
    const res = await request(app).post('/eleicoes').set('Authorization', bearer(tokenChefe)).send({ data: '2026-11-23', turno: '1º Turno', horarioAbertura: '08:00', horarioEncerramento: '17:00' }).expect(201);
    eleicoes.push(res.body.id);
    return res.body.id as string;
  };
  const criarEleitor = async (nome: string) => (await request(app).post('/eleitores').set('Authorization', bearer(tokenChefe)).send({ nome, email: email(nome), senha }).expect(201)).body.id as string;
  const criarCandidato = async (nome: string, numeroEleitoral: string, cargo: string, eleicaoId: string) => (await request(app).post('/candidatos').set('Authorization', bearer(tokenChefe)).send({ nome, email: email(nome), senha, numeroEleitoral, cargo, eleicaoId, partido: 'Partido Teste' }).expect(201)).body.id as string;
  const votar = (token: string, eleicaoId: string, candidatoId: string) => request(app).post('/votacao').set('Authorization', bearer(token)).send({ eleicaoId, candidatoId });
  const mudar = (eleicaoId: string, acao: string) => request(app).patch(`/eleicoes/${eleicaoId}/${acao}`).set('Authorization', bearer(tokenChefe));

  beforeAll(async () => {
    process.env.JWT_SECRET = 'chave-aleatoria-exclusiva-do-teste-' + randomUUID();
    await verificarConexaoNeo4j();
    await criarConstraints();
    const session = getSession();
    try {
      await session.run(`UNWIND $cargos AS nome MERGE (:Cargo {nome: nome})`, { cargos: ['Deputado Estadual', 'Deputado Federal', 'Senador', 'Governador', 'Presidente da República'] });
      await session.run(`CREATE (:Usuario:ChefeSecao {id: $id, nome: 'Chefe teste', email: $email, senhaHash: $senhaHash})`, { id: adminId, email: email('chefe'), senhaHash: await bcrypt.hash(senha, 10) });
    } finally { await session.close(); }
    tokenChefe = await login('chefe');
  }, 120000);

  afterAll(async () => {
    try {
      const session = getSession();
      try {
        // Limpa apenas os dados identificados por este teste; nunca todo o banco.
        await session.run(`MATCH (p:RegistroParticipacao) WHERE any(id IN $ids WHERE p.chaveUnica CONTAINS ('_' + id + '_')) DETACH DELETE p`, { ids: eleicoes });
        await session.run(`MATCH (v:Voto)-[:NA_ELEICAO]->(e:Eleicao) WHERE e.id IN $ids DETACH DELETE v`, { ids: eleicoes });
        await session.run(`MATCH (u:Usuario) WHERE u.email STARTS WITH $prefixo DETACH DELETE u`, { prefixo: prefixo + '-' });
        await session.run(`MATCH (e:Eleicao) WHERE e.id IN $ids DETACH DELETE e`, { ids: eleicoes });
      } finally { await session.close(); }
    } finally {
      await fecharConexaoNeo4j();
      if (segredoAnterior === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = segredoAnterior;
    }
  }, 120000);

  it('valida CRUD, perfis, votação concorrente, sigilo e apuração final', async () => {
    const e = await criarEleicao();
    const outra = await criarEleicao();
    const u = await criarEleitor('eleitor');
    const u2 = await criarEleitor('eleitor2');
    const u3 = await criarEleitor('eleitor3');
    const c1 = await criarCandidato('governador1', '10', 'Governador', e);
    const c2 = await criarCandidato('governador2', '11', 'Governador', e);
    const c3 = await criarCandidato('senador', '12', 'Senador', e);
    const c4 = await criarCandidato('outra-eleicao', '13', 'Governador', outra);
    const c5 = await criarCandidato('temporario', '14', 'Senador', e);
    await request(app).put(`/candidatos/${c5}`).set('Authorization', bearer(tokenChefe)).send({ partido: 'Novo Partido' }).expect(200);
    await request(app).delete(`/candidatos/${c5}`).set('Authorization', bearer(tokenChefe)).expect(204);
    await request(app).put(`/eleitores/${u}`).set('Authorization', bearer(tokenChefe)).send({ nome: 'Eleitor atualizado' }).expect(200);
    const t = await login('eleitor');
    const t2 = await login('eleitor2');
    const t3 = await login('eleitor3');
    const tc = await login('governador1');
    await request(app).post('/auth/login').send({ email: email('eleitor'), senha: 'errada' }).expect(401);
    await votar(t, e, c1).expect(400);
    await mudar(e, 'abrir').expect(200);
    await votar(tc, e, c1).expect(403);
    await votar(t, e, c4).expect(400);
    await request(app).put(`/candidatos/${c1}`).set('Authorization', bearer(tokenChefe)).send({ eleicaoId: outra }).expect(400);
    await request(app).delete(`/candidatos/${c1}`).set('Authorization', bearer(tokenChefe)).expect(400);
    // Duas requisições simultâneas: apenas uma pode ser confirmada.
    const concorrentes = await Promise.all([votar(t, e, c1), votar(t, e, c2)]);
    expect(concorrentes.map(r => r.status).sort()).toEqual([201, 400]);
    expect(concorrentes.find(r => r.status === 201)!.body).toEqual({ mensagem: 'Voto confirmado com sucesso!', cargo: 'Governador' });
    await votar(t, e, c3).expect(201);
    const status = await request(app).get(`/votacao/meus-status/${e}`).set('Authorization', bearer(t)).expect(200);
    expect(status.body.cargosVotados.sort()).toEqual(['Governador', 'Senador']);
    const parcial = await request(app).get(`/resultados/${e}/acompanhamento`).set('Authorization', bearer(tc)).expect(200);
    expect(parcial.body.resultados.map((r: any) => r.cargo)).toEqual(['Governador']);
    await request(app).delete(`/eleitores/${u2}`).set('Authorization', bearer(tokenChefe)).expect(204);
    await votar(t2, e, c1).expect(401);
    await request(app).post('/auth/login').send({ email: email('eleitor2'), senha }).expect(401);
    await request(app).get(`/resultados/${e}/final`).set('Authorization', bearer(t)).expect(400);
    // Encerramento e voto concorrentes: voto anterior ao encerramento pode entrar, posterior não.
    const [ultimo, fim] = await Promise.all([votar(t3, e, c1), mudar(e, 'encerrar')]);
    expect([201, 400]).toContain(ultimo.status);
    expect(fim.status).toBe(200);
    await votar(t3, e, c3).expect(400);
    await mudar(e, 'abrir').expect(400);
    const final = await request(app).get(`/resultados/${e}/final`).set('Authorization', bearer(t)).expect(200);
    const total = final.body.resultadoFinal.flatMap((g: any) => g.candidatos).reduce((s: number, c: any) => s + c.totalVotos, 0);
    expect(total).toBe(ultimo.status === 201 ? 3 : 2);
    // A apuração deve permanecer igual após tentativa de alteração.
    await request(app).delete(`/candidatos/${c2}`).set('Authorization', bearer(tokenChefe)).expect(400);
    const novamente = await request(app).get(`/resultados/${e}/final`).set('Authorization', bearer(t)).expect(200);
    expect(novamente.body).toEqual(final.body);
    const session = getSession();
    try {
      const votos = await session.run(`MATCH (v:Voto)-[:NA_ELEICAO]->(:Eleicao {id: $id}) RETURN keys(v) AS campos`, { id: e });
      expect(votos.records.length).toBe(total);
      votos.records.forEach(r => expect(r.get('campos')).toEqual(['id']));
      const participacoes = await session.run(`MATCH (p:RegistroParticipacao) WHERE p.chaveUnica CONTAINS ('_' + $id + '_') RETURN keys(p) AS campos`, { id: e });
      expect(participacoes.records.length).toBe(total);
      participacoes.records.forEach(r => expect(r.get('campos')).toEqual(['chaveUnica']));
    } finally { await session.close(); }
    expect(u3).toBeTruthy();
  }, 180000);
});
