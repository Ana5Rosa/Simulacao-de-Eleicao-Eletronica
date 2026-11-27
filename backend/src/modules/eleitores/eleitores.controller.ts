import { Request, Response } from 'express';
import { EleitoresService } from './eleitores.service';
import { responderErro } from '../../shared/errors';
import { objetoObrigatorio } from '../../shared/validacao';

export class EleitoresController {
  constructor(private eleitoresService = new EleitoresService()) {}

  cadastrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleitor = await this.eleitoresService.cadastrarEleitor(objetoObrigatorio(req.body) as any);
      res.status(201).json(eleitor);
    } catch (error: unknown) {
      responderErro(res, error, 400);
    }
  };

  listar = async (_req: Request, res: Response): Promise<void> => {
    try {
      const eleitores = await this.eleitoresService.listarEleitores();
      res.status(200).json(eleitores);
    } catch (error: unknown) {
      responderErro(res, error, 500);
    }
  };

  consultarPorId = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleitor = await this.eleitoresService.consultarEleitor(String(req.params.id));
      res.status(200).json(eleitor);
    } catch (error: unknown) {
      responderErro(res, error, 404);
    }
  };

  alterar = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleitor = await this.eleitoresService.alterarEleitor(
        String(req.params.id),
        objetoObrigatorio(req.body) as any
      );
      res.status(200).json(eleitor);
    } catch (error: unknown) {
      responderErro(res, error, 400);
    }
  };

  excluir = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.eleitoresService.excluirEleitor(String(req.params.id));
      res.status(204).send();
    } catch (error: unknown) {
      responderErro(res, error, 404);
    }
  };
}
