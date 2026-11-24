import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'API - Sistema de Simulação de Eleição Eletrónica',
    version: '1.0.0',
    description: 'API RESTful em Node.js + TypeScript + Neo4j para simulação de eleição eletrónica.',
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['1. Autenticação'],
        summary: 'Login de Chefe da Seção, Eleitor ou Candidato',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'senha'],
                properties: {
                  email: { type: 'string', example: 'chefe@eleicao.gov.br' },
                  senha: { type: 'string', example: 'SUA_SENHA_DO_CHEFE' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Token JWT gerado' }, 401: { description: 'Credenciais inválidas' } },
      },
    },
    '/eleicoes': {
      get: {
        tags: ['2. Eleições'],
        summary: 'Lista todas as eleições e suas situações',
        responses: { 200: { description: 'Lista de eleições' } },
      },
      post: {
        tags: ['2. Eleições'],
        summary: 'Cadastra uma nova eleição (Apenas Chefe da Seção)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data', 'turno', 'horarioAbertura', 'horarioEncerramento'],
                properties: {
                  data: { type: 'string', example: '2026-11-23' },
                  turno: { type: 'string', enum: ['1º Turno', '2º Turno'], example: '1º Turno' },
                  horarioAbertura: { type: 'string', example: '08:00' },
                  horarioEncerramento: { type: 'string', example: '17:00' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Eleição criada como AGENDADA' } },
      },
    },
    '/eleicoes/{id}': {
      get: {
        tags: ['2. Eleições'],
        summary: 'Consulta a situação atual de uma eleição',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Detalhes da eleição' } },
      },
    },
    '/eleicoes/{id}/abrir': {
      patch: {
        tags: ['2. Eleições'],
        summary: 'Abre a votação (AGENDADA -> ABERTA) (Apenas Chefe da Seção)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Eleição aberta' } },
      },
    },
    '/eleicoes/{id}/encerrar': {
      patch: {
        tags: ['2. Eleições'],
        summary: 'Encerra a votação (ABERTA -> ENCERRADA) (Apenas Chefe da Seção)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Eleição encerrada' } },
      },
    },
    '/eleitores': {
      get: { tags: ['3. Eleitores'], summary: 'Lista eleitores (Chefe da Seção)', responses: { 200: { description: 'OK' } } },
      post: {
        tags: ['3. Eleitores'],
        summary: 'Cadastra eleitor (Chefe da Seção)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'email', 'senha'],
                properties: {
                  nome: { type: 'string', example: 'Maria Silva' },
                  email: { type: 'string', example: 'maria@eleitor.com' },
                  senha: { type: 'string', example: 'SenhaTeste123' },
                  tituloEleitor: { type: 'string', example: '123456789012' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Eleitor criado' } },
      },
    },
    '/eleitores/{id}': {
      get: { tags: ['3. Eleitores'], summary: 'Consulta eleitor por ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      put: { tags: ['3. Eleitores'], summary: 'Altera dados de um eleitor', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { nome: { type: 'string' }, email: { type: 'string' }, senha: { type: 'string', minLength: 8 }, tituloEleitor: { type: 'string' } } } } } }, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Atualizado' }, 400: { description: 'Dados ou situação inválidos' }, 401: { description: 'Não autenticado' }, 403: { description: 'Acesso negado' } } },
      delete: { tags: ['3. Eleitores'], summary: 'Desativa eleitor e invalida o acesso' , parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Excluído' }, 400: { description: 'Operação não permitida' }, 401: { description: 'Não autenticado' }, 403: { description: 'Acesso negado' }, 404: { description: 'Não encontrado' } } },
    },
    '/candidatos': {
      get: {
        tags: ['4. Candidatos'],
        summary: 'Lista candidatos (filtros opcionais: eleicaoId, cargo)',
        parameters: [
          { name: 'eleicaoId', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'cargo', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'OK' } },
      },
      post: {
        tags: ['4. Candidatos'],
        summary: 'Cadastra candidato em eleição AGENDADA (Chefe da Seção)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'email', 'senha', 'numeroEleitoral', 'partido', 'cargo', 'eleicaoId'],
                properties: {
                  nome: { type: 'string', example: 'João Souza' },
                  email: { type: 'string', example: 'joao@candidato.com' },
                  senha: { type: 'string', example: 'SenhaTeste123' },
                  numeroEleitoral: { type: 'string', example: '13' },
                  partido: { type: 'string', example: 'Partido Exemplo' },
                  cargo: { type: 'string', example: 'Presidente da República' },
                  eleicaoId: { type: 'string', example: 'UUID_DA_ELEICAO' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Candidato criado e vinculado' }, 400: { description: 'Dados inválidos ou eleição não agendada' }, 401: { description: 'Não autenticado' }, 403: { description: 'Acesso negado' } },
      },
    },
    '/candidatos/{id}': {
      get: { tags: ['4. Candidatos'], summary: 'Consulta candidato por ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      put: { tags: ['4. Candidatos'], summary: 'Altera candidato (somente eleição AGENDADA)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { nome: { type: 'string' }, email: { type: 'string' }, senha: { type: 'string', minLength: 8 }, numeroEleitoral: { type: 'string' }, partido: { type: 'string' }, cargo: { type: 'string' }, eleicaoId: { type: 'string' } } } } } }, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Atualizado' }, 400: { description: 'Dados ou situação inválidos' }, 401: { description: 'Não autenticado' }, 403: { description: 'Acesso negado' } } },
      delete: { tags: ['4. Candidatos'], summary: 'Exclui candidato (somente eleição AGENDADA)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Excluído' }, 400: { description: 'Operação não permitida' }, 401: { description: 'Não autenticado' }, 403: { description: 'Acesso negado' }, 404: { description: 'Não encontrado' } } },
    },
    '/votacao': {
      post: {
        tags: ['5. Votação'],
        summary: 'Registra e confirma voto sigiloso (Apenas Eleitor, eleição ABERTA)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['eleicaoId', 'candidatoId'],
                properties: {
                  eleicaoId: { type: 'string', example: 'UUID_DA_ELEICAO' },
                  candidatoId: { type: 'string', example: 'UUID_DO_CANDIDATO' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Voto confirmado, sem identificador do voto', content: { 'application/json': { schema: { type: 'object', properties: { mensagem: { type: 'string', example: 'Voto confirmado com sucesso!' }, cargo: { type: 'string', example: 'Governador' } } } } } },
          400: { description: 'Eleição fechada, candidato inválido ou voto duplicado para o cargo' },
          401: { description: 'Token inválido ou usuário inativo' },
          503: { description: 'Banco de dados indisponível ou falha de gravação' },
          403: { description: 'Apenas Eleitores podem votar' },
        },
      },
    },
    '/votacao/meus-status/{eleicaoId}': {
      get: {
        tags: ['5. Votação'],
        summary: 'Consulta em quais cargos o Eleitor já votou (sem revelar o candidato)',
        parameters: [{ name: 'eleicaoId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Lista de cargos já votados' } },
      },
    },
    '/resultados/{eleicaoId}/acompanhamento': {
      get: {
        tags: ['6. Acompanhamento da Votação'],
        summary: 'Acompanha votos em tempo real (Eleitor vê todos; Candidato vê apenas seu cargo)',
        parameters: [{ name: 'eleicaoId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Parcial de votos por candidato/cargo' } },
      },
    },
    '/resultados/{eleicaoId}/final': {
      get: {
        tags: ['7. Resultado Final'],
        summary: 'Consulta o resultado final e o mais votado por cargo (após ENCERRADA)',
        parameters: [{ name: 'eleicaoId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Resultado final apurado' },
          400: { description: 'Eleição ainda não encerrada' },
        },
      },
    },
  },
};

export const configurarSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};