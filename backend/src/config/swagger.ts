import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { CARGOS_OFICIAIS } from '../shared/validacao';

const respostaErro = (descricao: string) => ({
  description: descricao,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErroResposta' },
    },
  },
});

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'API - Sistema de Simulação de Eleição Eletrônica',
    version: '1.1.0',
    description:
      'API RESTful em Node.js + TypeScript + Neo4j para simulação de eleição eletrônica. ' +
      'A especificação OpenAPI pode ser importada diretamente no Postman ou Insomnia via `/api-docs.json`.',
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ErroResposta: {
        type: 'object',
        properties: {
          erro: { type: 'string', example: 'Mensagem descritiva do erro.' },
        },
      },
      Eleicao: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          data: { type: 'string', example: '2026-11-23' },
          turno: { type: 'string', enum: ['1º Turno', '2º Turno'], example: '1º Turno' },
          horarioAbertura: { type: 'string', example: '08:00' },
          horarioEncerramento: { type: 'string', example: '17:00' },
          status: { type: 'string', enum: ['AGENDADA', 'ABERTA', 'ENCERRADA'], example: 'AGENDADA' },
        },
      },
      Eleitor: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nome: { type: 'string', example: 'Maria Silva' },
          email: { type: 'string', example: 'maria@eleitor.com' },
          tituloEleitor: { type: 'string', example: '123456789012' },
        },
      },
      Candidato: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nome: { type: 'string', example: 'João Souza' },
          email: { type: 'string', example: 'joao@candidato.com' },
          numeroEleitoral: { type: 'string', example: '13' },
          partido: { type: 'string', example: 'Partido Exemplo' },
          cargo: { type: 'string', enum: [...CARGOS_OFICIAIS], example: 'Presidente da República' },
          eleicaoId: { type: 'string', format: 'uuid' },
        },
      },
      StatusVotacao: {
        type: 'object',
        properties: {
          eleicaoId: { type: 'string', format: 'uuid' },
          cargosVotados: {
            type: 'array',
            items: { type: 'string', enum: [...CARGOS_OFICIAIS] },
          },
          cargosPendentes: {
            type: 'array',
            items: { type: 'string', enum: [...CARGOS_OFICIAIS] },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['0. Sistema'],
        summary: 'Verifica se a API está ativa',
        security: [],
        responses: {
          200: {
            description: 'API ativa',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'OK' },
                    mensagem: { type: 'string', example: 'API da Eleição Eletrônica ativa!' },
                  },
                },
              },
            },
          },
        },
      },
    },
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
        responses: {
          200: { description: 'Token JWT gerado' },
          400: respostaErro('E-mail e senha não informados ou corpo JSON inválido'),
          401: respostaErro('Credenciais inválidas'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
    },
    '/eleicoes': {
      get: {
        tags: ['2. Eleições'],
        summary: 'Lista todas as eleições e suas situações',
        responses: {
          200: {
            description: 'Lista de eleições',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Eleicao' } },
              },
            },
          },
          401: respostaErro('Não autenticado'),
          503: respostaErro('Banco de dados indisponível'),
        },
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
        responses: {
          201: {
            description: 'Eleição criada como AGENDADA',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Eleicao' } } },
          },
          400: respostaErro('Dados inválidos de data, turno ou horários'),
          401: respostaErro('Não autenticado'),
          403: respostaErro('Apenas Chefe da Seção pode cadastrar eleições'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
    },
    '/eleicoes/{id}': {
      get: {
        tags: ['2. Eleições'],
        summary: 'Consulta a situação atual de uma eleição',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Detalhes da eleição',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Eleicao' } } },
          },
          401: respostaErro('Não autenticado'),
          404: respostaErro('Eleição não encontrada'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
    },
    '/eleicoes/{id}/abrir': {
      patch: {
        tags: ['2. Eleições'],
        summary: 'Abre a votação (AGENDADA -> ABERTA) (Apenas Chefe da Seção)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Eleição aberta',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Eleicao' } } },
          },
          400: respostaErro('Transição de situação inválida'),
          401: respostaErro('Não autenticado'),
          403: respostaErro('Acesso negado'),
          404: respostaErro('Eleição não encontrada'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
    },
    '/eleicoes/{id}/encerrar': {
      patch: {
        tags: ['2. Eleições'],
        summary: 'Encerra a votação (ABERTA -> ENCERRADA) (Apenas Chefe da Seção)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Eleição encerrada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Eleicao' } } },
          },
          400: respostaErro('Transição de situação inválida'),
          401: respostaErro('Não autenticado'),
          403: respostaErro('Acesso negado'),
          404: respostaErro('Eleição não encontrada'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
    },
    '/eleitores': {
      get: {
        tags: ['3. Eleitores'],
        summary: 'Lista eleitores (Chefe da Seção)',
        responses: {
          200: {
            description: 'Lista de eleitores ativos',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Eleitor' } },
              },
            },
          },
          401: respostaErro('Não autenticado'),
          403: respostaErro('Acesso negado'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
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
                  senha: { type: 'string', minLength: 8, example: 'SenhaTeste123' },
                  tituloEleitor: {
                    type: 'string',
                    pattern: '^\\d{12}$',
                    example: '123456789012',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Eleitor criado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Eleitor' } } },
          },
          400: respostaErro('Dados inválidos'),
          401: respostaErro('Não autenticado'),
          403: respostaErro('Acesso negado'),
          409: respostaErro('E-mail ou título de eleitor já cadastrado'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
    },
    '/eleitores/{id}': {
      get: {
        tags: ['3. Eleitores'],
        summary: 'Consulta eleitor por ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Dados do eleitor',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Eleitor' } } },
          },
          401: respostaErro('Não autenticado'),
          403: respostaErro('Acesso negado'),
          404: respostaErro('Eleitor não encontrado'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
      put: {
        tags: ['3. Eleitores'],
        summary: 'Altera dados de um eleitor',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nome: { type: 'string' },
                  email: { type: 'string' },
                  senha: { type: 'string', minLength: 8 },
                  tituloEleitor: { type: 'string', pattern: '^\\d{12}$' },
                },
              },
            },
          },
        },
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Atualizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Eleitor' } } },
          },
          400: respostaErro('Dados ou requisição inválidos'),
          401: respostaErro('Não autenticado'),
          403: respostaErro('Acesso negado'),
          404: respostaErro('Eleitor não encontrado'),
          409: respostaErro('E-mail ou título de eleitor já cadastrado'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
      delete: {
        tags: ['3. Eleitores'],
        summary: 'Desativa eleitor e invalida o acesso',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Excluído' },
          401: respostaErro('Não autenticado'),
          403: respostaErro('Acesso negado'),
          404: respostaErro('Eleitor não encontrado'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
    },
    '/candidatos': {
      get: {
        tags: ['4. Candidatos'],
        summary: 'Lista candidatos (filtros opcionais: eleicaoId, cargo)',
        parameters: [
          { name: 'eleicaoId', in: 'query', required: false, schema: { type: 'string' } },
          {
            name: 'cargo',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: [...CARGOS_OFICIAIS] },
          },
        ],
        responses: {
          200: {
            description: 'Lista de candidatos',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Candidato' } },
              },
            },
          },
          400: respostaErro('Filtro de cargo ou eleicaoId inválido'),
          401: respostaErro('Não autenticado'),
          503: respostaErro('Banco de dados indisponível'),
        },
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
                  senha: { type: 'string', minLength: 8, example: 'SenhaTeste123' },
                  numeroEleitoral: { type: 'string', example: '13' },
                  partido: { type: 'string', example: 'Partido Exemplo' },
                  cargo: {
                    type: 'string',
                    enum: [...CARGOS_OFICIAIS],
                    example: 'Presidente da República',
                  },
                  eleicaoId: { type: 'string', example: 'UUID_DA_ELEICAO' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Candidato criado e vinculado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Candidato' } } },
          },
          400: respostaErro('Dados inválidos ou eleição não agendada'),
          401: respostaErro('Não autenticado'),
          403: respostaErro('Acesso negado'),
          404: respostaErro('Eleição não encontrada'),
          409: respostaErro('E-mail ou número eleitoral já cadastrado na eleição'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
    },
    '/candidatos/{id}': {
      get: {
        tags: ['4. Candidatos'],
        summary: 'Consulta candidato por ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Dados do candidato',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Candidato' } } },
          },
          401: respostaErro('Não autenticado'),
          404: respostaErro('Candidato não encontrado'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
      put: {
        tags: ['4. Candidatos'],
        summary: 'Altera candidato (somente eleição AGENDADA)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nome: { type: 'string' },
                  email: { type: 'string' },
                  senha: { type: 'string', minLength: 8 },
                  numeroEleitoral: { type: 'string' },
                  partido: { type: 'string' },
                  cargo: { type: 'string', enum: [...CARGOS_OFICIAIS] },
                  eleicaoId: { type: 'string' },
                },
              },
            },
          },
        },
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Atualizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Candidato' } } },
          },
          400: respostaErro('Dados ou situação da eleição inválidos'),
          401: respostaErro('Não autenticado'),
          403: respostaErro('Acesso negado'),
          404: respostaErro('Candidato ou eleição não encontrada'),
          409: respostaErro('E-mail ou número eleitoral já cadastrado na eleição'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
      delete: {
        tags: ['4. Candidatos'],
        summary: 'Exclui candidato (somente eleição AGENDADA)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Excluído' },
          400: respostaErro('Operação não permitida após abertura da eleição'),
          401: respostaErro('Não autenticado'),
          403: respostaErro('Acesso negado'),
          404: respostaErro('Candidato não encontrado'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
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
          201: {
            description: 'Voto confirmado, sem identificador do voto',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensagem: { type: 'string', example: 'Voto confirmado com sucesso!' },
                    cargo: { type: 'string', example: 'Governador' },
                  },
                },
              },
            },
          },
          400: respostaErro('Eleição fechada, candidato inválido ou voto duplicado para o cargo'),
          401: respostaErro('Token inválido ou usuário inativo'),
          403: respostaErro('Apenas Eleitores podem votar'),
          404: respostaErro('Eleição não encontrada'),
          503: respostaErro('Banco de dados indisponível ou falha de gravação'),
        },
      },
    },
    '/votacao/meus-status/{eleicaoId}': {
      get: {
        tags: ['5. Votação'],
        summary: 'Consulta em quais cargos o Eleitor já votou e os pendentes (sem revelar o candidato)',
        parameters: [{ name: 'eleicaoId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Lista de cargos já votados e pendentes',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/StatusVotacao' } },
            },
          },
          401: respostaErro('Não autenticado'),
          403: respostaErro('Apenas Eleitores podem consultar seu status de votação'),
          404: respostaErro('Eleição não encontrada'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
    },
    '/resultados/{eleicaoId}/acompanhamento': {
      get: {
        tags: ['6. Acompanhamento da Votação'],
        summary: 'Acompanha votos em tempo real (Eleitor vê todos; Candidato vê apenas seu cargo)',
        parameters: [{ name: 'eleicaoId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Parcial de votos por candidato/cargo' },
          400: respostaErro('Acompanhamento indisponível para eleição AGENDADA'),
          401: respostaErro('Não autenticado'),
          403: respostaErro('Candidato não participa desta eleição'),
          404: respostaErro('Eleição não encontrada'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
    },
    '/resultados/{eleicaoId}/final': {
      get: {
        tags: ['7. Resultado Final'],
        summary: 'Consulta o resultado final e o mais votado por cargo (após ENCERRADA)',
        parameters: [{ name: 'eleicaoId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Resultado final apurado' },
          400: respostaErro('Eleição ainda não encerrada'),
          401: respostaErro('Não autenticado'),
          404: respostaErro('Eleição não encontrada'),
          503: respostaErro('Banco de dados indisponível'),
        },
      },
    },
  },
};

export const configurarSwagger = (app: Express): void => {
  app.get('/api-docs.json', (_req, res) => {
    res.json(swaggerDocument);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
