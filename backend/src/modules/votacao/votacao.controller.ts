import { Request, Response } from 'express';
import { VotacaoService } from './votacao.service';
import { responderErro } from '../../shared/errors';
import { objetoObrigatorio } from '../../shared/validacao';

export class VotacaoController {
  constructor(private votacaoService = new VotacaoService()) {}

  votar = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleitorId = req.usuario!.id;
      const { eleicaoId, candidatoId } = objetoObrigatorio(req.body);
      const resultado = await this.votacaoService.confirmarVoto({
        eleitorId,
        eleicaoId: eleicaoId as string,
        candidatoId: candidatoId as string,
      });
      res.status(201).json(resultado);
    } catch (error: unknown) {
      responderErro(res, error, 400);
    }
  };

  meusStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleitorId = req.usuario!.id;
      const eleicaoId = String(req.params.eleicaoId);
      const status = await this.votacaoService.consultarCargosVotados(eleitorId, eleicaoId);
      res.status(200).json(status);
    } catch (error: unknown) {
      responderErro(res, error, 400);
    }
  };
}
