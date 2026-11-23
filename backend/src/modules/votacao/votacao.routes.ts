import { Router } from 'express';
import { VotacaoController } from './votacao.controller';
import { autenticarJWT, exigirPerfil } from '../../shared/middlewares/authMiddleware';

const router = Router();
const controller = new VotacaoController();

// Somente usuários com perfil Eleitor podem votar ou consultar seu status de participação
router.use(autenticarJWT, exigirPerfil('Eleitor'));

router.post('/', controller.votar);
router.get('/meus-status/:eleicaoId', controller.meusStatus);

export default router;