import express from 'express';
import cors from 'cors';
import { configurarSwagger } from './config/swagger';
import authRoutes from './modules/auth/auth.routes';
import eleicoesRoutes from './modules/eleicoes/eleicoes.routes';
import eleitoresRoutes from './modules/eleitores/eleitores.routes';
import candidatosRoutes from './modules/candidatos/candidatos.routes';
import votacaoRoutes from './modules/votacao/votacao.routes';
import resultadosRoutes from './modules/resultados/resultados.routes';
import { rotaNaoEncontrada, tratarErroExpress } from './shared/middlewares/errorHandler';

const app = express();
app.use(cors());
app.use(express.json());

configurarSwagger(app);

app.use('/auth', authRoutes);
app.use('/eleicoes', eleicoesRoutes);
app.use('/eleitores', eleitoresRoutes);
app.use('/candidatos', candidatosRoutes);
app.use('/votacao', votacaoRoutes);
app.use('/resultados', resultadosRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', mensagem: 'API da Eleição Eletrônica ativa!' });
});

app.use(rotaNaoEncontrada);
app.use(tratarErroExpress);

export default app;
