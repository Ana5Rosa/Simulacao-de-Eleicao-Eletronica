import { Request, Response } from 'express';
import { CandidatosService } from './candidatos.service';
import { responderErro } from '../../shared/errors';
import { objetoObrigatorio } from '../../shared/validacao';

export class CandidatosController {
  constructor(private candidatosService = new CandidatosService()) {}

  cadastrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const candidato = await this.candidatosService.cadastrarCandidato(objetoObrigatorio(req.body) as any);
      res.status(201).json(candidato);
    } catch (error: unknown) {
      responderErro(res, error, 400);
    }
  };

  listar = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleicaoId = req.query.eleicaoId !== undefined ? String(req.query.eleicaoId) : undefined;
      const cargo = req.query.cargo !== undefined ? String(req.query.cargo) : undefined;
      const candidatos = await this.candidatosService.listarCandidatos({ eleicaoId, cargo });
      res.status(200).json(candidatos);
    } catch (error: unknown) {
      responderErro(res, error, 400);
    }
  };

  consultarPorId = async (req: Request, res: Response): Promise<void> => {
    try {
      const candidato = await this.candidatosService.consultarCandidato(String(req.params.id));
      res.status(200).json(candidato);
    } catch (error: unknown) {
      responderErro(res, error, 404);
    }
  };

  alterar = async (req: Request, res: Response): Promise<void> => {
    try {
      const candidato = await this.candidatosService.alterarCandidato(
        String(req.params.id),
        objetoObrigatorio(req.body) as any
      );
      res.status(200).json(candidato);
    } catch (error: unknown) {
      responderErro(res, error, 400);
    }
  };

  excluir = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.candidatosService.excluirCandidato(String(req.params.id));
      res.status(204).send();
    } catch (error: unknown) {
      responderErro(res, error, 400);
    }
  };
}
