import dotenv from 'dotenv';
import app from './app';
import { verificarConexaoNeo4j } from './config/neo4j';
import { obterSegredoJWT } from './config/env';
import { criarConstraints } from './config/constraints';
import { executarSeedInicial } from './config/seed';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);

const iniciarServidor = async () => {
  try {
    if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT inválida.');
    obterSegredoJWT();
    await verificarConexaoNeo4j();
    await criarConstraints();
    await executarSeedInicial();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`📚 Swagger UI em http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
};

iniciarServidor();