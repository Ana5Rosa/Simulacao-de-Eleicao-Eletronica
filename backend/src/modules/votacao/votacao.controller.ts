import { Request, Response } from 'express';
import { VotacaoService } from './votacao.service';

export class VotacaoController {
  constructor(private votacaoService = new VotacaoService()) {}

  votar = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleitorId = req.usuario!.id;
      const { eleicaoId, candidatoId } = req.body;
      const resultado = await this.votacaoService.confirmarVoto({
        eleitorId,
        eleicaoId,
        candidatoId,
      });
      res.status(201).json(resultado);
    } catch (error: any) {
      if (error.code) {
        res.status(503).json({ erro: 'Não foi possível concluir a operação no banco de dados.' });
      } else {
        res.status(400).json({ erro: error.message });
      }
    }
  };

  meusStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleitorId = req.usuario!.id;
      const eleicaoId = String(req.params.eleicaoId);
      const status = await this.votacaoService.consultarCargosVotados(eleitorId, eleicaoId);
      res.status(200).json(status);
    } catch (error: any) {
      if (error.code) {
        res.status(503).json({ erro: 'Não foi possível concluir a operação no banco de dados.' });
      } else {
        res.status(400).json({ erro: error.message });
      }
    }
  };
}