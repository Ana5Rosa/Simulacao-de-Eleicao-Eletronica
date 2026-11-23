import { Router } from 'express';
import { ResultadosController } from './resultados.controller';
import { autenticarJWT } from '../../shared/middlewares/authMiddleware';

const router = Router();
const controller = new ResultadosController();

router.use(autenticarJWT);

router.get('/:eleicaoId/acompanhamento', controller.acompanhamento);
router.get('/:eleicaoId/final', controller.final);

export default router;