import { Request, Response } from 'express';
import { CandidatosService } from './candidatos.service';

export class CandidatosController {
  constructor(private candidatosService = new CandidatosService()) {}

  cadastrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const candidato = await this.candidatosService.cadastrarCandidato(req.body);
      res.status(201).json(candidato);
    } catch (error: any) {
      res.status(400).json({ erro: error.message });
    }
  };

  listar = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleicaoId = req.query.eleicaoId ? String(req.query.eleicaoId) : undefined;
      const cargo = req.query.cargo ? String(req.query.cargo) : undefined;
      const candidatos = await this.candidatosService.listarCandidatos({ eleicaoId, cargo });
      res.status(200).json(candidatos);
    } catch (error: any) {
      res.status(500).json({ erro: error.message });
    }
  };

  consultarPorId = async (req: Request, res: Response): Promise<void> => {
    try {
      const candidato = await this.candidatosService.consultarCandidato(String(req.params.id));
      res.status(200).json(candidato);
    } catch (error: any) {
      res.status(404).json({ erro: error.message });
    }
  };

  alterar = async (req: Request, res: Response): Promise<void> => {
    try {
      const candidato = await this.candidatosService.alterarCandidato(String(req.params.id), req.body);
      res.status(200).json(candidato);
    } catch (error: any) {
      res.status(400).json({ erro: error.message });
    }
  };

  excluir = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.candidatosService.excluirCandidato(String(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(error.message === 'Candidato não encontrado.' ? 404 : 400).json({ erro: error.message });
    }
  };
}