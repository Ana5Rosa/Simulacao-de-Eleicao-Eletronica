import { Request, Response } from 'express';
import { ResultadosService } from './resultados.service';

export class ResultadosController {
  constructor(private resultadosService = new ResultadosService()) {}

  acompanhamento = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleicaoId = String(req.params.eleicaoId);
      const dados = await this.resultadosService.acompanharVotacao(eleicaoId, req.usuario!);
      res.status(200).json(dados);
    } catch (error: any) {
      res.status(400).json({ erro: error.message });
    }
  };

  final = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleicaoId = String(req.params.eleicaoId);
      const dados = await this.resultadosService.consultarResultadoFinal(eleicaoId);
      res.status(200).json(dados);
    } catch (error: any) {
      res.status(400).json({ erro: error.message });
    }
  };
}