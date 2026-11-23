import dotenv from 'dotenv';
import app from './app';
import { verificarConexaoNeo4j } from './config/neo4j';
import { executarSeedInicial } from './config/seed';

dotenv.config();

const PORT = process.env.PORT || 3000;

const iniciarServidor = async () => {
  try {
    await verificarConexaoNeo4j();
    await executarSeedInicial();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`📚 Swagger UI em http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Erro ao ligar ao Neo4j AuraDB:', error);
    process.exit(1);
  }
};

iniciarServidor();