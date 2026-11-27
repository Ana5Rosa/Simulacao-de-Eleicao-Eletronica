import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { CARGOS_OFICIAIS, emailValido, senhaValida } from '../shared/validacao';
import { getSession } from './neo4j';

export const executarSeedInicial = async (): Promise<void> => {
  const session = getSession();
  try {
    // 1. Garante os 5 cargos oficiais do minimundo
    await session.run(
      `UNWIND $cargos AS nomeCargo
       MERGE (:Cargo {nome: nomeCargo})`,
      { cargos: [...CARGOS_OFICIAIS] }
    );

    // 2. Garante o Chefe da Seção inicial com hash seguro
    const emailChefe = emailValido(process.env.CHEFE_EMAIL);
    const senhaPlana = senhaValida(process.env.CHEFE_SENHA);
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
