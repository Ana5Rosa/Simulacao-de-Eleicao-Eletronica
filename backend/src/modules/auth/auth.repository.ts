import { getSession } from '../../config/neo4j';
import { PerfilUsuario } from '../../shared/middlewares/authMiddleware';

export interface UsuarioBanco {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  perfil: PerfilUsuario;
}

export class AuthRepository {
  async buscarPorEmail(email: string): Promise<UsuarioBanco | null> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (u:Usuario {email: $email})
         WHERE coalesce(u.ativo, true)
         RETURN u.id AS id, u.nome AS nome, u.email AS email,
                u.senhaHash AS senhaHash, labels(u) AS labels`,
        { email }
      );

      if (result.records.length === 0) return null;

      const record = result.records[0];
      const labels: string[] = record.get('labels');

      const perfis = (['ChefeSecao', 'Candidato', 'Eleitor'] as const).filter(p => labels.includes(p));
      if (perfis.length !== 1) return null;
      const perfil: PerfilUsuario = perfis[0];

      return {
        id: record.get('id'),
        nome: record.get('nome'),
        email: record.get('email'),
        senhaHash: record.get('senhaHash'),
        perfil,
      };
    } finally {
      await session.close();
    }
  }
}