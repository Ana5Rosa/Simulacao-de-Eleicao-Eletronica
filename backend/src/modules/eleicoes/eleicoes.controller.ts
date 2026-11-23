import { Request, Response } from 'express';
import { EleicoesService } from './eleicoes.service';

export class EleicoesController {
  constructor(private eleicoesService = new EleicoesService()) {}

  cadastrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleicao = await this.eleicoesService.cadastrarEleicao(req.body);
      res.status(201).json(eleicao);
    } catch (error: any) {
      res.status(400).json({ erro: error.message });
    }
  };

  listar = async (_req: Request, res: Response): Promise<void> => {
    try {
      const eleicoes = await this.eleicoesService.listarEleicoes();
      res.status(200).json(eleicoes);
    } catch (error: any) {
      res.status(500).json({ erro: error.message });
    }
  };

  consultarPorId = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleicao = await this.eleicoesService.consultarSituacao(String(req.params.id));
      res.status(200).json(eleicao);
    } catch (error: any) {
      res.status(404).json({ erro: error.message });
    }
  };

  abrir = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleicao = await this.eleicoesService.abrirVotacao(String(req.params.id));
      res.status(200).json(eleicao);
    } catch (error: any) {
      res.status(400).json({ erro: error.message });
    }
  };

  encerrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleicao = await this.eleicoesService.encerrarVotacao(String(req.params.id));
      res.status(200).json(eleicao);
    } catch (error: any) {
      res.status(400).json({ erro: error.message });
    }
  };
}