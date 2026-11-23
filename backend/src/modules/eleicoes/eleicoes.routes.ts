import { Router } from 'express';
import { EleicoesController } from './eleicoes.controller';
import { autenticarJWT, exigirPerfil } from '../../shared/middlewares/authMiddleware';

const router = Router();
const controller = new EleicoesController();

router.use(autenticarJWT);

router.get('/', controller.listar);
router.get('/:id', controller.consultarPorId);
router.post('/', exigirPerfil('ChefeSecao'), controller.cadastrar);
router.patch('/:id/abrir', exigirPerfil('ChefeSecao'), controller.abrir);
router.patch('/:id/encerrar', exigirPerfil('ChefeSecao'), controller.encerrar);

export default router;