import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../src/modules/auth/auth.service';
import { CandidatosService } from '../../src/modules/candidatos/candidatos.service';
import { EleitoresService } from '../../src/modules/eleitores/eleitores.service';
import {
  CARGOS_OFICIAIS,
  cargoValido,
  dataValida,
  emailValido,
  exigirAlgumCampoAtualizacao,
  horarioValido,
  numeroEleitoralValido,
  objetoObrigatorio,
  senhaValida,
  tituloEleitorValido,
  turnoValido,
} from '../../src/shared/validacao';

describe('Testes Unitários - Validações, Autenticação e Cadastros', () => {
  describe('Módulo de validação', () => {
    it('deve aceitar todos os 5 cargos oficiais e rejeitar cargos desconhecidos', () => {
      for (const cargo of CARGOS_OFICIAIS) {
        expect(cargoValido(`  ${cargo}  `)).toBe(cargo);
      }
      expect(() => cargoValido('Prefeito')).toThrow('Cargo inválido');
    });

    it('deve normalizar e validar e-mail, número eleitoral e título de eleitor', () => {
      expect(emailValido('  Maria@Eleitor.COM  ')).toBe('maria@eleitor.com');
      expect(() => emailValido('invalido')).toThrow('E-mail inválido');

      expect(numeroEleitoralValido(' 13 ')).toBe('13');
      expect(() => numeroEleitoralValido('13A')).toThrow('somente dígitos');

      expect(tituloEleitorValido(' 123456789012 ')).toBe('123456789012');
      expect(() => tituloEleitorValido('12345')).toThrow('12 dígitos');
    });

    it('deve validar limites de senha, data, horário, turno e objeto de entrada', () => {
      expect(senhaValida('SenhaForte123')).toBe('SenhaForte123');
      expect(() => senhaValida('curta')).toThrow('pelo menos 8 caracteres');
      expect(() => senhaValida('a'.repeat(73))).toThrow('máximo 72 bytes');

      expect(dataValida('2024-02-29')).toBe('2024-02-29');
      expect(() => dataValida('2026-02-29')).toThrow('Data inválida');

      expect(horarioValido('08:30')).toBe('08:30');
      expect(() => horarioValido('24:00')).toThrow('Horário inválido');

      expect(turnoValido('2º Turno')).toBe('2º Turno');
      expect(() => turnoValido('3º Turno')).toThrow('Turno inválido');

      expect(() => objetoObrigatorio([])).toThrow('objeto JSON');
      expect(() => exigirAlgumCampoAtualizacao({ nome: undefined })).toThrow('ao menos um campo');
    });
  });

  describe('AuthService', () => {
    const segredoOriginal = process.env.JWT_SECRET;

    beforeAll(() => {
      process.env.JWT_SECRET = 'chave-secreta-unitaria-com-mais-de-32-caracteres';
    });

    afterAll(() => {
      if (segredoOriginal === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = segredoOriginal;
    });

    it('deve autenticar usuário válido e emitir JWT sem expor senhaHash', async () => {
      const senhaHash = await bcrypt.hash('SenhaTeste123', 10);
      const repo = {
        buscarPorEmail: jest.fn().mockResolvedValue({
          id: 'u1',
          nome: 'Maria',
          email: 'maria@eleitor.com',
          senhaHash,
          perfil: 'Eleitor',
        }),
      };

      const res = await new AuthService(repo as any).login('  MARIA@eleitor.com ', 'SenhaTeste123');
      expect(repo.buscarPorEmail).toHaveBeenCalledWith('maria@eleitor.com');
      expect(res.usuario).toEqual({
        id: 'u1',
        nome: 'Maria',
        email: 'maria@eleitor.com',
        perfil: 'Eleitor',
      });

      const payload = jwt.verify(res.token, process.env.JWT_SECRET!) as jwt.JwtPayload;
      expect(payload.id).toBe('u1');
      expect(payload.perfil).toBe('Eleitor');
    });

    it('deve rejeitar login sem e-mail ou senha com status 400', async () => {
      const repo = { buscarPorEmail: jest.fn() };
      await expect(new AuthService(repo as any).login('', '123')).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(repo.buscarPorEmail).not.toHaveBeenCalled();
    });

    it('deve rejeitar usuário inexistente ou senha incorreta com status 401', async () => {
      const senhaHash = await bcrypt.hash('SenhaCorreta123', 10);
      const repo = {
        buscarPorEmail: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: 'u1',
            nome: 'Maria',
            email: 'maria@eleitor.com',
            senhaHash,
            perfil: 'Eleitor',
          }),
      };
      const service = new AuthService(repo as any);

      await expect(service.login('nao@existe.com', 'SenhaTeste123')).rejects.toMatchObject({
        statusCode: 401,
      });
      await expect(service.login('maria@eleitor.com', 'SenhaErrada')).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  describe('EleitoresService', () => {
    it('deve cadastrar eleitor com senha criptografada e e-mail normalizado', async () => {
      const repo = {
        criar: jest.fn().mockImplementation(async (dados) => ({ id: 'e1', ...dados })),
      };

      const eleitor = await new EleitoresService(repo as any).cadastrarEleitor({
        nome: '  João Pedro  ',
        email: 'JOAO@eleitor.com',
        senha: 'SenhaForte123',
        tituloEleitor: '123456789012',
      });

      expect(repo.criar).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'João Pedro',
          email: 'joao@eleitor.com',
          tituloEleitor: '123456789012',
        })
      );
      expect(eleitor.id).toBe('e1');
      expect((repo.criar.mock.calls[0][0] as any).senhaHash).not.toBe('SenhaForte123');
    });

    it('deve mapear conflito de e-mail duplicado para erro 409', async () => {
      const repo = {
        criar: jest
          .fn()
          .mockRejectedValue({ code: 'Neo.ClientError.Schema.ConstraintValidationFailed' }),
      };

      await expect(
        new EleitoresService(repo as any).cadastrarEleitor({
          nome: 'Maria',
          email: 'maria@eleitor.com',
          senha: 'SenhaForte123',
        })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('deve rejeitar alteração vazia sem consultar repositório', async () => {
      const repo = { buscarPorId: jest.fn(), atualizar: jest.fn() };
      await expect(new EleitoresService(repo as any).alterarEleitor('e1', {})).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(repo.buscarPorId).not.toHaveBeenCalled();
    });

    it('deve retornar erro 404 ao consultar eleitor inexistente', async () => {
      const repo = { buscarPorId: jest.fn().mockResolvedValue(null) };
      await expect(new EleitoresService(repo as any).consultarEleitor('e404')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('CandidatosService', () => {
    it('deve rejeitar cargo fora da lista oficial antes de chamar o repositório', async () => {
      const repo = { criar: jest.fn() };
      await expect(
        new CandidatosService(repo as any).cadastrarCandidato({
          nome: 'Carlos',
          email: 'carlos@cand.com',
          senha: 'SenhaForte123',
          numeroEleitoral: '15',
          partido: 'PA',
          cargo: 'Vereador',
          eleicaoId: 'el-1',
        })
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(repo.criar).not.toHaveBeenCalled();
    });

    it('deve validar filtro de cargo na listagem de candidatos', async () => {
      const repo = { listar: jest.fn().mockResolvedValue([]) };
      const service = new CandidatosService(repo as any);

      await service.listarCandidatos({ cargo: 'Senador', eleicaoId: 'el-1' });
      expect(repo.listar).toHaveBeenCalledWith({ cargo: 'Senador', eleicaoId: 'el-1' });

      await expect(service.listarCandidatos({ cargo: 'Prefeito' })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('deve mapear e-mail duplicado no cadastro de candidato para erro 409', async () => {
      const repo = {
        criar: jest
          .fn()
          .mockRejectedValue({ code: 'Neo.ClientError.Schema.ConstraintValidationFailed' }),
      };

      await expect(
        new CandidatosService(repo as any).cadastrarCandidato({
          nome: 'Carlos',
          email: 'carlos@cand.com',
          senha: 'SenhaForte123',
          numeroEleitoral: '15',
          partido: 'PA',
          cargo: 'Senador',
          eleicaoId: 'el-1',
        })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('deve rejeitar alteração vazia de candidato com erro 400', async () => {
      const repo = { atualizar: jest.fn() };
      await expect(new CandidatosService(repo as any).alterarCandidato('c1', {})).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(repo.atualizar).not.toHaveBeenCalled();
    });
  });
});
