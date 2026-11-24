import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { getSession } from '../../src/config/neo4j';

jest.mock('../../src/config/neo4j', () => ({ getSession: jest.fn() }));

const secret = 'chave-exclusiva-testes-http-sem-uso-em-producao';
const originalSecret = process.env.JWT_SECRET;
beforeAll(() => { process.env.JWT_SECRET = secret; });
beforeEach(() => {
  (getSession as jest.Mock).mockReturnValue({
    run: jest.fn().mockResolvedValue({ records: [{ get: (campo: string) => ({ id: 'user-test-id', email: 'teste@eleicao.com', nome: 'Teste' } as Record<string, string>)[campo] }] }),
    close: jest.fn().mockResolvedValue(undefined),
  });
});

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

  it('POST /votacao com perfil Candidato deve retornar 403', async () => {
    const res = await request(app).post('/votacao').set('Authorization', `Bearer ${gerarTokenTeste('Candidato')}`).send({});
    expect(res.status).toBe(403);
  });
  it('deve recusar token de usuário que foi excluído', async () => {
    (getSession as jest.Mock).mockReturnValueOnce({ run: jest.fn().mockResolvedValue({ records: [] }), close: jest.fn().mockResolvedValue(undefined) });
    const res = await request(app).post('/votacao').set('Authorization', `Bearer ${gerarTokenTeste('Eleitor')}`).send({});
    expect(res.status).toBe(401);
  });
  afterAll(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });
});