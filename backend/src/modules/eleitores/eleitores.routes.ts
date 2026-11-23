import { Router } from 'express';
import { EleitoresController } from './eleitores.controller';
import { autenticarJWT, exigirPerfil } from '../../shared/middlewares/authMiddleware';

const router = Router();
const controller = new EleitoresController();

router.use(autenticarJWT, exigirPerfil('ChefeSecao'));

router.post('/', controller.cadastrar);
router.get('/', controller.listar);
router.get('/:id', controller.consultarPorId);
router.put('/:id', controller.alterar);
router.delete('/:id', controller.excluir);

export default router;