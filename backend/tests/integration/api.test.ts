import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { driver } from '../../src/config/neo4j';

const secret = process.env.JWT_SECRET || 'chave_secreta_eleicao_2026';

const gerarTokenTeste = (perfil: 'ChefeSecao' | 'Eleitor' | 'Candidato') => {
  return jwt.sign(
    { id: 'user-test-id', email: 'teste@eleicao.com', nome: 'Usuário Teste', perfil },
    secret,
    { expiresIn: '1h' }
  );
};

describe('Testes de Integração - Rotas, Autenticação e Perfis (HTTP)', () => {
  it('GET /health deve retornar status 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('POST /eleicoes sem token JWT deve retornar 401 (Não autenticado)', async () => {
    const res = await request(app).post('/eleicoes').send({
      data: '2026-11-23',
      turno: '1º Turno',
      horarioAbertura: '08:00',
      horarioEncerramento: '17:00',
    });

    expect(res.status).toBe(401);
  });

  it('POST /eleicoes com perfil Eleitor deve retornar 403 (Acesso negado)', async () => {
    const tokenEleitor = gerarTokenTeste('Eleitor');

    const res = await request(app)
      .post('/eleicoes')
      .set('Authorization', `Bearer ${tokenEleitor}`)
      .send({
        data: '2026-11-23',
        turno: '1º Turno',
        horarioAbertura: '08:00',
        horarioEncerramento: '17:00',
      });

    expect(res.status).toBe(403);
    expect(res.body.erro).toContain('Acesso negado');
  });

    it('POST /votacao com perfil ChefeSecao deve retornar 403 (Apenas Eleitor pode votar)', async () => {
    const tokenChefe = gerarTokenTeste('ChefeSecao');

    const res = await request(app)
      .post('/votacao')
      .set('Authorization', `Bearer ${tokenChefe}`)
      .send({
        eleicaoId: 'eleicao-1',
        candidatoId: 'cand-1',
      });

        expect(res.status).toBe(403);
    });

  afterAll(async () => {
    await driver.close();
  });
});