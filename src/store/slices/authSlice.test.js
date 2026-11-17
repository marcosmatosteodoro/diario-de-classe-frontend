import * as authSlice from './authSlice';
import { login, logout } from './authSlice';
import { LogoutService } from '@/services/auth/logoutService';
import { LoiginService } from '@/services/auth/loginService';

jest.mock('@/services/auth/loginService');
jest.mock('@/services/auth/logoutService');

const SEM_CONEXAO_MESSAGE =
  'Não foi possível concluir a ação. Verifique sua conexão com a internet e tente novamente.';

function findRejected(dispatch) {
  const call = dispatch.mock.calls.find(
    ([action]) => action.type === login.rejected.type
  );
  return call?.[0];
}

describe('authSlice - mensagem de erro do thunk login', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('usa a mensagem fixa de conexão quando a chamada falha sem response (rede)', async () => {
    LoiginService.handle.mockRejectedValue({ message: 'Network Error' });

    const dispatch = jest.fn();
    await login({ email: 'a@a.com', senha: '123' })(
      dispatch,
      () => ({}),
      undefined
    );

    const rejected = findRejected(dispatch);
    expect(rejected.payload.message).toBe(SEM_CONEXAO_MESSAGE);
  });

  it('propaga a mensagem do servidor quando error.response.data.message existe', async () => {
    LoiginService.handle.mockRejectedValue({
      response: { status: 401, data: { message: 'Credenciais inválidas' } },
    });

    const dispatch = jest.fn();
    await login({ email: 'a@a.com', senha: '123' })(
      dispatch,
      () => ({}),
      undefined
    );

    const rejected = findRejected(dispatch);
    expect(rejected.payload.message).toBe('Credenciais inválidas');
  });
});

describe('authSlice - transporte de sair (TASK-003-005)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('o thunk logout chama LogoutService.handle sem argumento', async () => {
    LogoutService.handle.mockResolvedValue({ data: null });
    const dispatch = jest.fn();
    await logout()(dispatch, () => ({}), undefined);
    expect(LogoutService.handle).toHaveBeenCalledTimes(1);
    expect(LogoutService.handle.mock.calls[0]).toHaveLength(0);
  });

  it.each([
    ['500', { response: { status: 500, data: {} } }, 500],
    ['403', { response: { status: 403, data: {} } }, 403],
    ['sem response', { message: 'Network Error' }, undefined],
  ])(
    'o rejected de logout propaga statusError (%s)',
    async (_, erro, esperado) => {
      LogoutService.handle.mockRejectedValue(erro);
      const dispatch = jest.fn();
      await logout()(dispatch, () => ({}), undefined);
      const rejected = dispatch.mock.calls.find(
        ([a]) => a.type === logout.rejected.type
      )[0];
      expect(rejected.payload.statusError).toBe(esperado);
      expect(typeof rejected.payload.message).toBe('string');
    }
  );

  it('o thunk refreshToken não é mais exportado', () => {
    expect('refreshToken' in authSlice).toBe(false);
  });
});
