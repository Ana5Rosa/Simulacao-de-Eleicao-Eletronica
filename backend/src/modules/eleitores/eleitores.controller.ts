import { Request, Response } from 'express';
import { EleitoresService } from './eleitores.service';

export class EleitoresController {
  constructor(private eleitoresService = new EleitoresService()) {}

  cadastrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleitor = await this.eleitoresService.cadastrarEleitor(req.body);
      res.status(201).json(eleitor);
    } catch (error: any) {
      res.status(400).json({ erro: error.message });
    }
  };

  listar = async (_req: Request, res: Response): Promise<void> => {
    try {
      const eleitores = await this.eleitoresService.listarEleitores();
      res.status(200).json(eleitores);
    } catch (error: any) {
      res.status(500).json({ erro: error.message });
    }
  };

  consultarPorId = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleitor = await this.eleitoresService.consultarEleitor(String(req.params.id));
      res.status(200).json(eleitor);
    } catch (error: any) {
      res.status(404).json({ erro: error.message });
    }
  };

  alterar = async (req: Request, res: Response): Promise<void> => {
    try {
      const eleitor = await this.eleitoresService.alterarEleitor(String(req.params.id), req.body);
      res.status(200).json(eleitor);
    } catch (error: any) {
      res.status(400).json({ erro: error.message });
    }
  };

  excluir = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.eleitoresService.excluirEleitor(String(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ erro: error.message });
    }
  };
}