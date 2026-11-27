import { Response } from 'express';

/**
 * Erro de domínio/aplicação com código HTTP explícito.
 */
export class ErroAplicacao extends Error {
  constructor(
    public readonly statusCode: number,
    mensagem: string
  ) {
    super(mensagem);
    this.name = 'ErroAplicacao';
  }
}

export const erroValidacao = (mensagem: string): ErroAplicacao => new ErroAplicacao(400, mensagem);
export const erroNaoAutenticado = (mensagem: string): ErroAplicacao => new ErroAplicacao(401, mensagem);
export const erroProibido = (mensagem: string): ErroAplicacao => new ErroAplicacao(403, mensagem);
export const erroNaoEncontrado = (mensagem: string): ErroAplicacao => new ErroAplicacao(404, mensagem);
export const erroConflito = (mensagem: string): ErroAplicacao => new ErroAplicacao(409, mensagem);

/**
 * Converte erros de serviços, repositórios ou driver Neo4j em resposta HTTP JSON padronizada.
 */
export function responderErro(res: Response, error: unknown, statusPadrao = 400): void {
  if (error instanceof ErroAplicacao) {
    res.status(error.statusCode).json({ erro: error.message });
    return;
  }

  const err = error as { code?: unknown; message?: string } | null;
  if (err && typeof err.code === 'string' && err.code.length > 0) {
    if (err.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
      res.status(409).json({ erro: 'Registro duplicado em conflito com restrição de integridade.' });
      return;
    }
    res.status(503).json({ erro: 'Não foi possível concluir a operação no banco de dados.' });
    return;
  }

  const mensagem = err?.message || 'Erro interno do servidor.';
  if (/não encontrad[oa]\.?$/i.test(mensagem)) {
    res.status(404).json({ erro: mensagem });
    return;
  }

  res.status(statusPadrao).json({ erro: mensagem });
}
