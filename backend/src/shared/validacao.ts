import { erroValidacao } from './errors';

export const CARGOS_OFICIAIS = [
  'Deputado Estadual',
  'Deputado Federal',
  'Senador',
  'Governador',
  'Presidente da República',
] as const;

export type CargoOficial = (typeof CARGOS_OFICIAIS)[number];

export function objetoObrigatorio(valor: unknown, mensagem = 'Corpo da requisição deve ser um objeto JSON.'): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw erroValidacao(mensagem);
  }
  return valor as Record<string, unknown>;
}

export function exigirAlgumCampoAtualizacao(campos: Record<string, unknown>): void {
  const possuiCampo = Object.values(campos).some((valor) => valor !== undefined);
  if (!possuiCampo) {
    throw erroValidacao('Informe ao menos um campo para atualização.');
  }
}

export function texto(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw erroValidacao(`${campo} é obrigatório e deve ser um texto não vazio.`);
  }
  return valor.trim();
}

export function emailValido(valor: unknown): string {
  const email = texto(valor, 'E-mail');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw erroValidacao('E-mail inválido.');
  }
  return email.toLowerCase();
}

export function senhaValida(valor: unknown): string {
  if (typeof valor !== 'string' || valor.length < 8 || Buffer.byteLength(valor, 'utf8') > 72 || !valor.trim()) {
    throw erroValidacao('A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.');
  }
  return valor;
}

export function numeroEleitoralValido(valor: unknown): string {
  const numero = texto(valor, 'Número eleitoral');
  if (!/^\d+$/.test(numero)) {
    throw erroValidacao('Número eleitoral deve conter somente dígitos (envie como texto).');
  }
  return numero;
}

export function tituloEleitorValido(valor: unknown): string {
  const titulo = texto(valor, 'Título de eleitor');
  if (!/^\d{12}$/.test(titulo)) {
    throw erroValidacao('Título de eleitor deve conter exatamente 12 dígitos numéricos.');
  }
  return titulo;
}

export function cargoValido(valor: unknown): CargoOficial {
  const cargo = texto(valor, 'Cargo');
  if (!(CARGOS_OFICIAIS as readonly string[]).includes(cargo)) {
    throw erroValidacao(`Cargo inválido. Escolha entre: ${CARGOS_OFICIAIS.join(', ')}.`);
  }
  return cargo as CargoOficial;
}

export function dataValida(valor: unknown): string {
  const data = texto(valor, 'Data');
  const parsed = new Date(`${data}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== data) {
    throw erroValidacao('Data inválida. Use AAAA-MM-DD.');
  }
  return data;
}

export function horarioValido(valor: unknown): string {
  const horario = texto(valor, 'Horário');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) {
    throw erroValidacao('Horário inválido. Use HH:mm.');
  }
  return horario;
}

export function turnoValido(valor: unknown): string {
  const turno = texto(valor, 'Turno');
  if (!['1º Turno', '2º Turno'].includes(turno)) {
    throw erroValidacao('Turno inválido. Use 1º Turno ou 2º Turno.');
  }
  return turno;
}
