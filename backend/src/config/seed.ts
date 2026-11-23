import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getSession } from './neo4j';

export const executarSeedInicial = async (): Promise<void> => {
  const session = getSession();
  try {
    // 1. Garante os 5 cargos oficiais do minimundo
    const cargos = [
      'Deputado Estadual',
      'Deputado Federal',
      'Senador',
      'Governador',
      'Presidente da República',
    ];

    await session.run(
      `UNWIND $cargos AS nomeCargo
       MERGE (:Cargo {nome: nomeCargo})`,
      { cargos }
    );

    // 2. Garante o Chefe da Seção inicial com hash seguro
    const emailChefe = process.env.CHEFE_EMAIL || 'chefe@eleicao.gov.br';
    const senhaPlana = process.env.CHEFE_SENHA || 'admin123';
    const senhaHash = await bcrypt.hash(senhaPlana, 10);

    await session.run(
      `MERGE (c:Usuario:ChefeSecao {email: $email})
       ON CREATE SET
         c.id = $id,
         c.nome = 'Chefe da Seção Principal',
         c.senhaHash = $senhaHash
       ON MATCH SET
         c.senhaHash = $senhaHash`,
      {
        id: randomUUID(),
        email: emailChefe,
        senhaHash,
      }
    );

    console.log(`✅ Seed inicial verificado (Chefe: ${emailChefe})`);
  } finally {
    await session.close();
  }
};