import { Request, Response } from 'express';
import { EleicoesService } from './eleicoes.service';
import { responderErro } from '../../shared/errors';
import { objetoObrigatorio } from '../../shared/validacao';

export class EleicoesController {
  constructor(private eleicoesService = new EleicoesService()) {}

  cadastrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleicao = await this.eleicoesService.cadastrarEleicao(objetoObrigatorio(req.body) as any);
      res.status(201).json(eleicao);
    } catch (error: unknown) {
      responderErro(res, error, 400);
    }
  };

  listar = async (_req: Request, res: Response): Promise<void> => {
    try {
      const eleicoes = await this.eleicoesService.listarEleicoes();
      res.status(200).json(eleicoes);
    } catch (error: unknown) {
      responderErro(res, error, 500);
    }
  };

  consultarPorId = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleicao = await this.eleicoesService.consultarSituacao(String(req.params.id));
      res.status(200).json(eleicao);
    } catch (error: unknown) {
      responderErro(res, error, 404);
    }
  };

  abrir = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleicao = await this.eleicoesService.abrirVotacao(String(req.params.id));
      res.status(200).json(eleicao);
    } catch (error: unknown) {
      responderErro(res, error, 400);
    }
  };

  encerrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleicao = await this.eleicoesService.encerrarVotacao(String(req.params.id));
      res.status(200).json(eleicao);
    } catch (error: unknown) {
      responderErro(res, error, 400);
    }
  };
}
