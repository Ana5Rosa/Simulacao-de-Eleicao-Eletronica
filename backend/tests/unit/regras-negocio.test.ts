import { VotacaoService } from '../../src/modules/votacao/votacao.service';
import { ResultadosService } from '../../src/modules/resultados/resultados.service';
import { EleicoesService } from '../../src/modules/eleicoes/eleicoes.service';

describe('Testes Unitários - Regras de Negócio da Eleição', () => {
  describe('VotacaoService', () => {
    const dados = { eleitorId: 'eleitor-1', eleicaoId: 'eleicao-1', candidatoId: 'cand-1' };
    it('deve validar os identificadores antes de gravar', async () => {
      const repo = { registrarVotoSigiloso: jest.fn() };
      await expect(new VotacaoService(repo as any).confirmarVoto({ ...dados, candidatoId: '' })).rejects.toThrow('candidatoId');
      expect(repo.registrarVotoSigiloso).not.toHaveBeenCalled();
    });
    it.each(['AGENDADA', 'ENCERRADA'])('deve propagar o bloqueio transacional da eleição %s', async status => {
      const repo = { registrarVotoSigiloso: jest.fn().mockRejectedValue(new Error(`Votação não permitida. A eleição está atualmente ${status}.`)) };
      await expect(new VotacaoService(repo as any).confirmarVoto(dados)).rejects.toThrow(status);
    });
    it('deve propagar o bloqueio de voto duplicado', async () => {
      const repo = { registrarVotoSigiloso: jest.fn().mockRejectedValue(new Error('Você já registrou e confirmou seu voto para o cargo de Senador nesta eleição.')) };
      await expect(new VotacaoService(repo as any).confirmarVoto(dados)).rejects.toThrow('já registrou');
    });
    it('deve confirmar sem revelar o identificador ou candidato do voto', async () => {
      const repo = { registrarVotoSigiloso: jest.fn().mockResolvedValue({ cargo: 'Senador', votoId: 'interno' }) };
      const res = await new VotacaoService(repo as any).confirmarVoto(dados);
      expect(repo.registrarVotoSigiloso).toHaveBeenCalledWith(dados);
      expect(res).toEqual({ mensagem: 'Voto confirmado com sucesso!', cargo: 'Senador' });
    });
  });

  describe('ResultadosService', () => {
    it('deve restringir o acompanhamento do Candidato apenas ao seu próprio cargo', async () => {
      const mockRepo = {
        buscarStatusEleicao: jest.fn().mockResolvedValue('ABERTA'),
        buscarCargoDoCandidatoNaEleicao: jest.fn().mockResolvedValue('Governador'),
        contabilizarVotos: jest.fn().mockResolvedValue([
          {
            candidatoId: 'c1',
            nome: 'Ana',
            numeroEleitoral: '10',
            partido: 'PA',
            cargo: 'Governador',
            totalVotos: 15,
          },
        ]),
      };

      const service = new ResultadosService(mockRepo as any);
      const resultado = await service.acompanharVotacao('eleicao-1', {
        id: 'c1',
        email: 'ana@cand.com',
        nome: 'Ana',
        perfil: 'Candidato',
      });

      expect(mockRepo.contabilizarVotos).toHaveBeenCalledWith('eleicao-1', 'Governador');
      expect(resultado.restritoAoCargo).toBe('Governador');
    });

    it('deve bloquear consulta do resultado final enquanto a eleição estiver ABERTA', async () => {
      const mockRepo = {
        buscarStatusEleicao: jest.fn().mockResolvedValue('ABERTA'),
        buscarCargoDoCandidatoNaEleicao: jest.fn(),
        contabilizarVotos: jest.fn(),
      };

      const service = new ResultadosService(mockRepo as any);

      await expect(service.consultarResultadoFinal('eleicao-1')).rejects.toThrow(
        'O resultado final só pode ser consultado após o encerramento da votação'
      );
    });

    it('deve apontar o candidato mais votado por cargo quando a eleição estiver ENCERRADA', async () => {
      const mockRepo = {
        buscarStatusEleicao: jest.fn().mockResolvedValue('ENCERRADA'),
        buscarCargoDoCandidatoNaEleicao: jest.fn(),
        contabilizarVotos: jest.fn().mockResolvedValue([
          {
            candidatoId: 'c1',
            nome: 'Carlos',
            numeroEleitoral: '45',
            partido: 'PB',
            cargo: 'Presidente da República',
            totalVotos: 42,
          },
          {
            candidatoId: 'c2',
            nome: 'Beatriz',
            numeroEleitoral: '12',
            partido: 'PC',
            cargo: 'Presidente da República',
            totalVotos: 30,
          },
        ]),
      };

      const service = new ResultadosService(mockRepo as any);
      const res = await service.consultarResultadoFinal('eleicao-1');

      expect(res.resultadoFinal[0].maisVotado).toMatchObject({
        nome: 'Carlos',
        totalVotos: 42,
      });
    });
  });

  describe('EleicoesService', () => {
    it.each([
      { data: '2026-02-30' }, { turno: '3º Turno' }, { horarioAbertura: '25:00' }, { horarioEncerramento: '07:00' },
    ])('deve rejeitar dados inválidos de eleição: %o', async alteracoes => {
      const repo = { criar: jest.fn() };
      await expect(new EleicoesService(repo as any).cadastrarEleicao({ data: '2026-11-23', turno: '1º Turno', horarioAbertura: '08:00', horarioEncerramento: '17:00', ...alteracoes })).rejects.toThrow();
      expect(repo.criar).not.toHaveBeenCalled();
    });
    it('deve impedir encerrar uma eleição que ainda está AGENDADA', async () => {
      const mockRepo = {
        buscarPorId: jest.fn().mockResolvedValue({
          id: 'e1',
          data: '2026-11-23',
          turno: '1º Turno',
          horarioAbertura: '08:00',
          horarioEncerramento: '17:00',
          status: 'AGENDADA',
        }),
        atualizarStatus: jest.fn(),
      };

      const service = new EleicoesService(mockRepo as any);

      await expect(service.encerrarVotacao('e1')).rejects.toThrow(
        'Só é possível encerrar uma eleição ABERTA'
      );
    });
  });
});