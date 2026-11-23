import neo4j, { Driver, Session } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.NEO4J_URI || '';
const user = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || '';

export const driver: Driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

export const getSession = (): Session => {
  return driver.session();
};

export const verificarConexaoNeo4j = async (): Promise<void> => {
  await driver.verifyConnectivity();
  console.log('✅ Conectado com sucesso ao Neo4j AuraDB Free!');
};