export function obterSegredoJWT(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret === 'chave_secreta_eleicao_2026') {
    throw new Error('Configure JWT_SECRET com pelo menos 32 caracteres aleatórios.');
  }
  return secret;
}
