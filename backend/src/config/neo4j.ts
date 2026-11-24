import neo4j, { Driver, Session } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();
let driver: Driver | undefined;

export const getDriver = (): Driver => {
  if (!driver) {
    const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;
    if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
      throw new Error('Configure NEO4J_URI, NEO4J_USERNAME e NEO4J_PASSWORD no .env.');
    }
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));
  }
  return driver;
};
export const getSession = (): Session => getDriver().session();
export const verificarConexaoNeo4j = async (): Promise<void> => {
  await getDriver().verifyConnectivity();
  console.log('Neo4j conectado.');
};
export const fecharConexaoNeo4j = async (): Promise<void> => {
  if (driver) { await driver.close(); driver = undefined; }
};
