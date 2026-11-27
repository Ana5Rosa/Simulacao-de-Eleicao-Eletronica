import { NextFunction, Request, Response } from 'express';

/**
 * Responde em JSON quando nenhuma rota corresponde ao caminho solicitado.
 */
export function rotaNaoEncontrada(_req: Request, res: Response): void {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

/**
 * Middleware global para capturar JSON malformado e exceções não tratadas.
 */
export function tratarErroExpress(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  const erro = err as { type?: string; status?: number } | null;
  if (err instanceof SyntaxError && (erro?.type === 'entity.parse.failed' || erro?.status === 400)) {
    res.status(400).json({ erro: 'Corpo da requisição JSON inválido.' });
    return;
  }

  res.status(500).json({ erro: 'Erro interno do servidor.' });
}
