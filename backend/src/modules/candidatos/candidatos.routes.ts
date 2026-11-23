import { Router } from 'express';
import { CandidatosController } from './candidatos.controller';
import { autenticarJWT, exigirPerfil } from '../../shared/middlewares/authMiddleware';

const router = Router();
const controller = new CandidatosController();

router.use(autenticarJWT);

router.get('/', controller.listar);
router.get('/:id', controller.consultarPorId);
router.post('/', exigirPerfil('ChefeSecao'), controller.cadastrar);
router.put('/:id', exigirPerfil('ChefeSecao'), controller.alterar);
router.delete('/:id', exigirPerfil('ChefeSecao'), controller.excluir);

export default router;