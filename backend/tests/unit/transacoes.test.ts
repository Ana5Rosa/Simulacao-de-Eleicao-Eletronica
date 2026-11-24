import { getSession } from '../../src/config/neo4j';
import { VotacaoRepository } from '../../src/modules/votacao/votacao.repository';
import { EleicoesRepository } from '../../src/modules/eleicoes/eleicoes.repository';
import { CandidatosRepository } from '../../src/modules/candidatos/candidatos.repository';

jest.mock('../../src/config/neo4j', () => ({ getSession: jest.fn() }));
const record = (dados: Record<string, unknown>) => ({ get: (campo: string) => dados[campo] });
const resultado = (dados?: Record<string, unknown>) => ({ records: dados ? [record(dados)] : [] });
function preparar(...respostas: ReturnType<typeof resultado>[]) {
  const run = jest.fn();
  respostas.forEach(r => run.mockResolvedValueOnce(r));
  const close = jest.fn().mockResolvedValue(undefined);
  const executeWrite = jest.fn(async callback => callback({ run }));
  (getSession as jest.Mock).mockReturnValue({ executeWrite, close });
  return { run, close, executeWrite };
}
const voto = { eleitorId: 'u1', eleicaoId: 'e1', candidatoId: 'c1' };

describe('Transações dos repositórios (mock do driver)', () => {
  it('não escreve voto se eleição estiver ENCERRADA após obter o lock', async () => {
    const tx = preparar(resultado({ status: 'ENCERRADA' }));
    await expect(new VotacaoRepository().registrarVotoSigiloso(voto)).rejects.toThrow('ENCERRADA');
    expect(tx.run).toHaveBeenCalledTimes(1);
  });
  it('não escreve voto de eleitor inativo', async () => {
    const tx = preparar(resultado({ status: 'ABERTA' }), resultado({ ativo: false }));
    await expect(new VotacaoRepository().registrarVotoSigiloso(voto)).rejects.toThrow('inativo');
    expect(tx.run).toHaveBeenCalledTimes(2);
  });
  it('não escreve voto de candidato de outra eleição', async () => {
    const tx = preparar(resultado({ status: 'ABERTA' }), resultado({ ativo: true }), resultado());
    await expect(new VotacaoRepository().registrarVotoSigiloso(voto)).rejects.toThrow('Candidato inválido');
    expect(tx.run).toHaveBeenCalledTimes(3);
  });
  it('não cria segundo voto para o mesmo cargo', async () => {
    const tx = preparar(resultado({ status: 'ABERTA' }), resultado({ ativo: true }), resultado({ cargo: 'Senador' }), resultado({ p: {} }));
    await expect(new VotacaoRepository().registrarVotoSigiloso(voto)).rejects.toThrow('já registrou');
    expect(tx.run).toHaveBeenCalledTimes(4);
  });
  it('grava participação e voto na mesma transação sem horários ou vínculo com eleitor', async () => {
    const tx = preparar(resultado({ status: 'ABERTA' }), resultado({ ativo: true }), resultado({ cargo: 'Senador' }), resultado(), resultado(), resultado({ id: 'v1' }));
    await expect(new VotacaoRepository().registrarVotoSigiloso(voto)).resolves.toEqual({ cargo: 'Senador' });
    expect(tx.executeWrite).toHaveBeenCalledTimes(1);
    expect(tx.run.mock.calls[4][1]).toEqual({ chaveUnica: 'u1_e1_Senador' });
    expect(tx.run.mock.calls[5][1]).not.toHaveProperty('eleitorId');
    expect(tx.run.mock.calls[4][0] + tx.run.mock.calls[5][0]).not.toMatch(/datetime|registradoEm|confirmadoEm/);
  });
  it('rejeita reabertura de eleição encerrada', async () => {
    const tx = preparar(resultado({ status: 'ENCERRADA' }));
    await expect(new EleicoesRepository().atualizarStatus('e1', 'ABERTA')).rejects.toThrow('Transição');
    expect(tx.run).toHaveBeenCalledTimes(1);
  });
  it('não exclui candidato depois da abertura', async () => {
    const tx = preparar(resultado({ id: 'c1' }), resultado({ eleicaoId: 'e1' }), resultado({ status: 'ABERTA' }));
    await expect(new CandidatosRepository().excluir('c1')).rejects.toThrow('AGENDADAS');
    expect(tx.run).toHaveBeenCalledTimes(3);
  });
  it('não move candidato para eleição encerrada', async () => {
    const tx = preparar(resultado({ id: 'c1' }), resultado({ eleicaoId: 'e1', cargo: 'Senador', numeroEleitoral: '10' }), resultado({ status: 'AGENDADA' }), resultado({ status: 'ENCERRADA' }));
    await expect(new CandidatosRepository().atualizar('c1', { eleicaoId: 'e2' })).rejects.toThrow('AGENDADAS');
    expect(tx.run).toHaveBeenCalledTimes(4);
  });
});
