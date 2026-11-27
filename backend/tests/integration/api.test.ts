import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../../src/app';
import { getSession } from '../../src/config/neo4j';

jest.mock('../../src/config/neo4j', () => ({ getSession: jest.fn() }));

const secret = 'chave-exclusiva-testes-http-sem-uso-em-producao';
const originalSecret = process.env.JWT_SECRET;

const mockSessaoComRegistros = (...respostas: Array<Array<Record<string, unknown>>>) => {
  const run = jest.fn();
  respostas.forEach((registros) => {
    run.mockResolvedValueOnce({
      records: registros.map((dados) => ({ get: (campo: string) => dados[campo] })),
    });
  });
  const close = jest.fn().mockResolvedValue(undefined);
  (getSession as jest.Mock).mockReturnValueOnce({ run, close });
  return { run, close };
};

const usuarioAtivo = () => [
  { id: 'user-test-id', email: 'teste@eleicao.com', nome: 'Teste' },
];

beforeAll(() => {
  process.env.JWT_SECRET = secret;
});

beforeEach(() => {
  (getSession as jest.Mock).mockReset();
  (getSession as jest.Mock).mockImplementation(() => ({
    run: jest.fn().mockResolvedValue({
      records: [
        {
          get: (campo: string) =>
            ({ id: 'user-test-id', email: 'teste@eleicao.com', nome: 'Teste' } as Record<
              string,
              string
            >)[campo],
        },
      ],
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }));
});

const gerarTokenTeste = (perfil: 'ChefeSecao' | 'Eleitor' | 'Candidato') => {
  return jwt.sign(
    { id: 'user-test-id', email: 'teste@eleicao.com', nome: 'Usuário Teste', perfil },
    secret,
    { expiresIn: '1h' }
  );
};

describe('Testes de Integração - Rotas, Autenticação e Perfis (HTTP)', () => {
  it('GET /health e GET /api-docs.json devem retornar status 200', async () => {
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('OK');

    const openapi = await request(app).get('/api-docs.json');
    expect(openapi.status).toBe(200);
    expect(openapi.body.openapi).toBe('3.0.0');
    expect(openapi.body.paths['/votacao']).toBeDefined();
  });

  it('deve retornar 404 em JSON para rota inexistente', async () => {
    const res = await request(app).get('/rota-desconhecida');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erro: 'Rota não encontrada.' });
  });

  it('deve retornar 400 em JSON para corpo malformado', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ erro: 'Corpo da requisição JSON inválido.' });
  });

  it('POST /auth/login deve validar campos, credenciais e emitir JWT válido', async () => {
    const semCampos = await request(app).post('/auth/login').send({});
    expect(semCampos.status).toBe(400);

    mockSessaoComRegistros([]);
    const naoEncontrado = await request(app)
      .post('/auth/login')
      .send({ email: 'inexistente@eleicao.com', senha: 'SenhaTeste123' });
    expect(naoEncontrado.status).toBe(401);

    const senhaHash = await bcrypt.hash('SenhaTeste123', 10);
    mockSessaoComRegistros([
      {
        id: 'u1',
        nome: 'Eleitor Teste',
        email: 'eleitor@eleicao.com',
        senhaHash,
        labels: ['Usuario', 'Eleitor'],
      },
    ]);
    const ok = await request(app)
      .post('/auth/login')
      .send({ email: 'ELEITOR@eleicao.com', senha: 'SenhaTeste123' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toEqual(expect.any(String));
    expect(ok.body.usuario).toEqual({
      id: 'u1',
      nome: 'Eleitor Teste',
      email: 'eleitor@eleicao.com',
      perfil: 'Eleitor',
    });
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

  it('POST /eleicoes e PATCH /eleicoes/:id/abrir|encerrar com perfil Eleitor devem retornar 403', async () => {
    const tokenEleitor = gerarTokenTeste('Eleitor');

    const criar = await request(app)
      .post('/eleicoes')
      .set('Authorization', `Bearer ${tokenEleitor}`)
      .send({
        data: '2026-11-23',
        turno: '1º Turno',
        horarioAbertura: '08:00',
        horarioEncerramento: '17:00',
      });
    expect(criar.status).toBe(403);
    expect(criar.body.erro).toContain('Acesso negado');

    const abrir = await request(app)
      .patch('/eleicoes/el-1/abrir')
      .set('Authorization', `Bearer ${tokenEleitor}`);
    expect(abrir.status).toBe(403);

    const encerrar = await request(app)
      .patch('/eleicoes/el-1/encerrar')
      .set('Authorization', `Bearer ${tokenEleitor}`);
    expect(encerrar.status).toBe(403);
  });

  it('GET /eleicoes/:id inexistente deve retornar 404', async () => {
    mockSessaoComRegistros(usuarioAtivo());
    mockSessaoComRegistros([]);
    const res = await request(app)
      .get('/eleicoes/nao-existe')
      .set('Authorization', `Bearer ${gerarTokenTeste('Eleitor')}`);
    expect(res.status).toBe(404);
  });

  it('rotas de /eleitores devem restringir acesso a ChefeSecao e retornar 400/404 corretamente', async () => {
    const bloqEleitor = await request(app)
      .get('/eleitores')
      .set('Authorization', `Bearer ${gerarTokenTeste('Eleitor')}`);
    expect(bloqEleitor.status).toBe(403);

    const bloqCandidato = await request(app)
      .post('/eleitores')
      .set('Authorization', `Bearer ${gerarTokenTeste('Candidato')}`)
      .send({});
    expect(bloqCandidato.status).toBe(403);

    const bodyInvalido = await request(app)
      .post('/eleitores')
      .set('Authorization', `Bearer ${gerarTokenTeste('ChefeSecao')}`)
      .send({ nome: 'Maria', email: 'invalido', senha: '123' });
    expect(bodyInvalido.status).toBe(400);

    mockSessaoComRegistros(usuarioAtivo());
    mockSessaoComRegistros([]);
    const naoEncontrado = await request(app)
      .get('/eleitores/nao-existe')
      .set('Authorization', `Bearer ${gerarTokenTeste('ChefeSecao')}`);
    expect(naoEncontrado.status).toBe(404);
  });

  it('rotas de /candidatos devem bloquear escrita para Eleitor e validar filtro de cargo na leitura', async () => {
    const tokenEleitor = gerarTokenTeste('Eleitor');

    const criar = await request(app)
      .post('/candidatos')
      .set('Authorization', `Bearer ${tokenEleitor}`)
      .send({});
    expect(criar.status).toBe(403);

    const cargoInvalido = await request(app)
      .get('/candidatos?cargo=Prefeito')
      .set('Authorization', `Bearer ${tokenEleitor}`);
    expect(cargoInvalido.status).toBe(400);

    mockSessaoComRegistros(usuarioAtivo());
    mockSessaoComRegistros([
      {
        id: 'c1',
        nome: 'Ana',
        email: 'ana@cand.com',
        numeroEleitoral: '10',
        partido: 'PA',
        cargo: 'Governador',
        eleicaoId: 'el-1',
      },
    ]);
    const listagem = await request(app)
      .get('/candidatos?cargo=Governador')
      .set('Authorization', `Bearer ${tokenEleitor}`);
    expect(listagem.status).toBe(200);
    expect(listagem.body).toHaveLength(1);
  });

  it('POST /votacao com ChefeSecao ou Candidato deve retornar 403', async () => {
    const tokenChefe = gerarTokenTeste('ChefeSecao');
    const resChefe = await request(app)
      .post('/votacao')
      .set('Authorization', `Bearer ${tokenChefe}`)
      .send({ eleicaoId: 'eleicao-1', candidatoId: 'cand-1' });
    expect(resChefe.status).toBe(403);

    const resCand = await request(app)
      .post('/votacao')
      .set('Authorization', `Bearer ${gerarTokenTeste('Candidato')}`)
      .send({});
    expect(resCand.status).toBe(403);
  });

  it('GET /votacao/meus-status/:eleicaoId deve respeitar perfil Eleitor e retornar cargos votados/pendentes', async () => {
    const bloqChefe = await request(app)
      .get('/votacao/meus-status/el-1')
      .set('Authorization', `Bearer ${gerarTokenTeste('ChefeSecao')}`);
    expect(bloqChefe.status).toBe(403);

    mockSessaoComRegistros(usuarioAtivo());
    mockSessaoComRegistros([]);
    const semEleicao = await request(app)
      .get('/votacao/meus-status/el-404')
      .set('Authorization', `Bearer ${gerarTokenTeste('Eleitor')}`);
    expect(semEleicao.status).toBe(404);

    mockSessaoComRegistros(usuarioAtivo());
    mockSessaoComRegistros([{ eleicaoId: 'el-1', chaves: ['user-test-id_el-1_Senador'] }]);
    const ok = await request(app)
      .get('/votacao/meus-status/el-1')
      .set('Authorization', `Bearer ${gerarTokenTeste('Eleitor')}`);
    expect(ok.status).toBe(200);
    expect(ok.body.cargosVotados).toEqual(['Senador']);
    expect(ok.body.cargosPendentes).not.toContain('Senador');
    expect(ok.body.cargosPendentes).toHaveLength(4);
  });

  it('rotas de /resultados devem exigir autenticação, retornar 404/403 e 503 em falha do banco', async () => {
    const semAuth = await request(app).get('/resultados/el-1/acompanhamento');
    expect(semAuth.status).toBe(401);

    mockSessaoComRegistros(usuarioAtivo());
    mockSessaoComRegistros([{ status: 'ABERTA' }]);
    mockSessaoComRegistros([]);
    const candFora = await request(app)
      .get('/resultados/el-1/acompanhamento')
      .set('Authorization', `Bearer ${gerarTokenTeste('Candidato')}`);
    expect(candFora.status).toBe(403);

    mockSessaoComRegistros(usuarioAtivo());
    (getSession as jest.Mock).mockReturnValueOnce({
      run: jest.fn().mockRejectedValue({ code: 'ServiceUnavailable', message: 'Offline' }),
      close: jest.fn().mockResolvedValue(undefined),
    });
    const erroBanco = await request(app)
      .get('/resultados/el-1/final')
      .set('Authorization', `Bearer ${gerarTokenTeste('Eleitor')}`);
    expect(erroBanco.status).toBe(503);
  });

  it('deve recusar token de usuário que foi excluído', async () => {
    (getSession as jest.Mock).mockReturnValueOnce({
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    });
    const res = await request(app)
      .post('/votacao')
      .set('Authorization', `Bearer ${gerarTokenTeste('Eleitor')}`)
      .send({});
    expect(res.status).toBe(401);
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });
});
