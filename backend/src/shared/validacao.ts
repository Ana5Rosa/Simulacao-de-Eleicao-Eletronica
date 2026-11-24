export function texto(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || !valor.trim()) throw new Error(`${campo} é obrigatório e deve ser um texto não vazio.`);
  return valor.trim();
}
export function emailValido(valor: unknown): string {
  const email = texto(valor, 'E-mail');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.');
  return email.toLowerCase();
}
export function senhaValida(valor: unknown): string {
  if (typeof valor !== 'string' || valor.length < 8 || Buffer.byteLength(valor, 'utf8') > 72 || !valor.trim()) {
    throw new Error('A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.');
  }
  return valor;
}
export function numeroEleitoralValido(valor: unknown): string {
  const numero = texto(valor, 'Número eleitoral');
  if (!/^\d+$/.test(numero)) throw new Error('Número eleitoral deve conter somente dígitos (envie como texto).');
  return numero;
}
export function dataValida(valor: unknown): string {
  const data = texto(valor, 'Data');
  const parsed = new Date(`${data}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== data) {
    throw new Error('Data inválida. Use AAAA-MM-DD.');
  }
  return data;
}
export function horarioValido(valor: unknown): string {
  const horario = texto(valor, 'Horário');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) throw new Error('Horário inválido. Use HH:mm.');
  return horario;
}
export function turnoValido(valor: unknown): string {
  const turno = texto(valor, 'Turno');
  if (!['1º Turno', '2º Turno'].includes(turno)) throw new Error('Turno inválido. Use 1º Turno ou 2º Turno.');
  return turno;
}
