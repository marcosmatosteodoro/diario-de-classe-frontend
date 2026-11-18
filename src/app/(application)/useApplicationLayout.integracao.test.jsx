import axios, { AxiosError } from 'axios';
import { Provider } from 'react-redux';
import { renderHook, act, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { useApplicationLayout } from './useApplicationLayout';
import { useLogout } from '@/hooks/auth/useLogout';
import { SESSION_END_REASON, SESSION_STATUS } from '@/constants/session';
import { UserAuthProvider, useUserAuth } from '@/providers/UserAuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { SEM_CONEXAO_MESSAGE } from '@/utils/thunkErrorPayload';
import { clearAppCache } from '@/utils/appCache';
import { reloadPage } from '@/utils/reloadPage';
import {
  clearSession,
  getAccessToken,
  getUserId,
} from '@/store/api/sessionManager';
import authReducer from '@/store/slices/authSlice';
import professoresReducer, {
  getProfessores,
} from '@/store/slices/professoresSlice';
import alunosReducer, { getAlunos } from '@/store/slices/alunosSlice';
import aulasReducer from '@/store/slices/aulasSlice';
import contratosReducer from '@/store/slices/contratosSlice';
import configuracaoReducer from '@/store/slices/configuracaoSlice';
import livrosReducer, { getLivros } from '@/store/slices/livrosSlice';
import diasAulasReducer, { getDiasAulas } from '@/store/slices/diasAulasSlice';
import cronogramasReducer, {
  getCronograma,
} from '@/store/slices/cronogramasSlice';
import relatorioReducer, { getRelatorios } from '@/store/slices/relatorioSlice';

const mockRouter = { push: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }));
jest.mock('@/providers/ToastProvider', () => ({ useToast: jest.fn() }));
jest.mock('@/utils/appCache', () => ({ clearAppCache: jest.fn() }));
jest.mock('@/utils/filterStorage', () => ({ clearAllFilters: jest.fn() }));
jest.mock('@/utils/reloadPage');

const MSG_EXPIRADA = 'Sua sessão expirou. Entre novamente para continuar.';

const USUARIO_1 = { id: 'u1', nome: 'Ana', permissao: 'admin' };
const RESTAURADA = {
  accessToken: 'tok-u1',
  user: USUARIO_1,
  configuracao: null,
};

// Fronteira de rede simulada no adapter do axios (herdado pelas instâncias
// que as *Api criam): AuthApi, AuthenticatedApi, interceptor, sessionManager e
// slices rodam de verdade.
let rede;
let chamadas;

function responder(config, status, data = {}) {
  const resposta = { status, data, config, headers: {}, statusText: '' };
  if (status >= 200 && status < 300) return resposta;
  throw new AxiosError('falha', 'ERR_BAD_REQUEST', config, null, resposta);
}

async function adaptador(config) {
  chamadas.push(config.url);
  if (config.url === '/auth/refresh-token') {
    return rede.refresh(config, chamadas.filter(u => u === config.url).length);
  }
  if (config.url === '/auth/logout') {
    if (rede.logoutSemRede) {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    }
    return responder(config, 204);
  }
  return rede.recurso(config);
}

function criarStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      professores: professoresReducer,
      alunos: alunosReducer,
      aulas: aulasReducer,
      contratos: contratosReducer,
      configuracao: configuracaoReducer,
      livros: livrosReducer,
      diasAulas: diasAulasReducer,
      cronogramas: cronogramasReducer,
      relatorio: relatorioReducer,
    },
  });
}

async function montarAutenticado() {
  const store = criarStore();
  const hook = renderHook(
    () => ({
      layout: useApplicationLayout(),
      saida: useLogout(),
      auth: useUserAuth(),
    }),
    {
      wrapper: ({ children }) => (
        <Provider store={store}>
          <UserAuthProvider>{children}</UserAuthProvider>
        </Provider>
      ),
    }
  );
  await waitFor(() =>
    expect(hook.result.current.auth.sessionStatus).toBe(
      SESSION_STATUS.AUTHENTICATED
    )
  );
  return { store, ...hook };
}

const logoutsFeitos = () => chamadas.filter(u => u === '/auth/logout').length;

describe('guarda de rota com provider, sessionManager e Apis reais', () => {
  let errorMock;
  let warningMock;
  let adaptadorOriginal;

  beforeEach(() => {
    adaptadorOriginal = axios.defaults.adapter;
    axios.defaults.adapter = adaptador;
    chamadas = [];
    errorMock = jest.fn();
    warningMock = jest.fn();
    useToast.mockReturnValue({
      error: errorMock,
      info: jest.fn(),
      warning: warningMock,
    });
    mockRouter.push.mockClear();
    jest.mocked(clearAppCache).mockClear();
    jest.mocked(reloadPage).mockClear();
    localStorage.clear();
    clearSession();
    rede = {
      refresh: (config, n) =>
        n === 1 ? responder(config, 200, RESTAURADA) : responder(config, 401),
      recurso: config => responder(config, 401),
    };
  });

  afterEach(() => {
    axios.defaults.adapter = adaptadorOriginal;
    clearSession();
  });

  it.each([
    ['livros (LivroApi)', store => store.dispatch(getLivros())],
    ['diasAulas (DiaAulaApi)', store => store.dispatch(getDiasAulas())],
    ['cronogramas (AlunoApi)', store => store.dispatch(getCronograma('a1'))],
    ['relatorio (RelatorioApi)', store => store.dispatch(getRelatorios())],
    ['alunos (AlunoApi)', store => store.dispatch(getAlunos())],
    ['professores (ProfessorApi)', store => store.dispatch(getProfessores())],
  ])(
    'recusa da renovação em %s: 1 aviso, clearAppCache 1 vez e push para /login',
    async (_nome, disparar) => {
      const { store } = await montarAutenticado();
      expect(getAccessToken()).toBe('tok-u1');

      await act(async () => {
        await disparar(store);
      });

      expect(chamadas.filter(u => u === '/auth/refresh-token')).toHaveLength(2);
      expect(errorMock).toHaveBeenCalledTimes(1);
      expect(errorMock).toHaveBeenCalledWith(MSG_EXPIRADA);
      expect(clearAppCache).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
      expect(logoutsFeitos()).toBe(0);
      expect(getAccessToken()).toBeNull();
    }
  );

  it('expiração encerra a sessão com o motivo expirada', async () => {
    const { result, store } = await montarAutenticado();
    await act(async () => {
      await store.dispatch(getAlunos());
    });
    expect(result.current.auth.endReason).toBe(SESSION_END_REASON.EXPIRADA);
  });

  it('sair com provider e guarda reais navega para /login exatamente 1 vez', async () => {
    const { result } = await montarAutenticado();
    await act(async () => {
      await result.current.saida.logoutUser();
    });

    expect(result.current.auth.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS);
    expect(result.current.auth.endReason).toBe(SESSION_END_REASON.SAIDA);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
    expect(errorMock).not.toHaveBeenCalled();
    expect(logoutsFeitos()).toBe(1);
  });

  it('sair sem rede: vai a /login 1 vez com o aviso de saída não confirmada e a marca pendente gravada', async () => {
    const { result } = await montarAutenticado();
    rede.logoutSemRede = true;

    await act(async () => {
      await result.current.saida.logoutUser();
    });

    expect(result.current.auth.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
    expect(warningMock).toHaveBeenCalledWith(
      expect.stringContaining('saída no servidor não foi confirmada')
    );
    expect(errorMock).not.toHaveBeenCalled();
    expect(localStorage.getItem('bls-saida-pendente')).not.toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('controle: falha de rede real sem troca de sessão grava a mensagem de conexão no slice', async () => {
    const { store } = await montarAutenticado();
    rede.recurso = config => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    };

    await act(async () => {
      await store.dispatch(getAlunos());
    });

    expect(store.getState().alunos.message).toBe(SEM_CONEXAO_MESSAGE);
  });

  describe('rejeição de sessão trocada ou identidade alterada é silenciosa', () => {
    function segurarRenovacao() {
      let encerrar;
      const pendente = new Promise(resolve => {
        encerrar = resolve;
      });
      rede.refresh = (config, n) =>
        n === 1
          ? responder(config, 200, RESTAURADA)
          : pendente.then(() => encerrar.resultado(config));
      return resultado => {
        encerrar.resultado = resultado;
        encerrar();
      };
    }

    async function dispararComRenovacaoEmVoo(store) {
      const promessa = store.dispatch(getAlunos());
      await waitFor(() =>
        expect(chamadas.filter(u => u === '/auth/refresh-token')).toHaveLength(
          2
        )
      );
      return promessa;
    }

    it('sair nesta aba com a renovação em voo: sem aviso de expiração, sem logout extra', async () => {
      const { result, store } = await montarAutenticado();
      const liberar = segurarRenovacao();

      let promessa;
      await act(async () => {
        promessa = dispararComRenovacaoEmVoo(store);
        await Promise.resolve();
      });
      await act(async () => {
        await result.current.saida.logoutUser();
      });
      await act(async () => {
        liberar(config => responder(config, 401));
        await promessa;
      });

      expect(errorMock).not.toHaveBeenCalled();
      expect(store.getState().alunos.message).not.toBe(SEM_CONEXAO_MESSAGE);
      expect(logoutsFeitos()).toBe(1);
      expect(result.current.auth.endReason).toBe(SESSION_END_REASON.SAIDA);
      expect(mockRouter.push).toHaveBeenCalledTimes(1);
    });

    it('saída de outra aba com a renovação em voo: sem aviso de expiração, sem logout', async () => {
      const { result, store } = await montarAutenticado();
      const liberar = segurarRenovacao();

      let promessa;
      await act(async () => {
        promessa = dispararComRenovacaoEmVoo(store);
        await Promise.resolve();
      });
      await act(async () => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'bls-sessao-evento',
            newValue: JSON.stringify({ tipo: 'saida', carimbo: 1 }),
          })
        );
      });
      await act(async () => {
        liberar(config => responder(config, 401));
        await promessa;
      });

      expect(result.current.auth.endReason).toBe(SESSION_END_REASON.OUTRA_ABA);
      expect(errorMock).not.toHaveBeenCalled();
      expect(store.getState().alunos.message).not.toBe(SEM_CONEXAO_MESSAGE);
      expect(logoutsFeitos()).toBe(0);
      expect(mockRouter.push).toHaveBeenCalledTimes(1);
    });

    it('outro usuário entrou com a renovação em voo: a sessão dele fica intacta, sem aviso nem logout', async () => {
      const { result, store } = await montarAutenticado();
      const liberar = segurarRenovacao();

      let promessa;
      await act(async () => {
        promessa = dispararComRenovacaoEmVoo(store);
        await Promise.resolve();
      });
      await act(async () => {
        result.current.auth.authenticate({
          accessToken: 'tok-u2',
          currentUser: { id: 'u2', nome: 'Beto', permissao: 'user' },
          duracaoAula: 40,
          tolerancia: 5,
          diasDeFuncionamento: [],
        });
      });
      await act(async () => {
        liberar(config => responder(config, 401));
        await promessa;
      });

      expect(errorMock).not.toHaveBeenCalled();
      expect(store.getState().alunos.message).not.toBe(SEM_CONEXAO_MESSAGE);
      expect(logoutsFeitos()).toBe(0);
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(result.current.auth.sessionStatus).toBe(
        SESSION_STATUS.AUTHENTICATED
      );
      expect(result.current.auth.currentUser.id).toBe('u2');
      expect(getAccessToken()).toBe('tok-u2');
      expect(getUserId()).toBe('u2');
    });

    it('identidade diferente na renovação: sem aviso de expiração e sem logout', async () => {
      const { result, store } = await montarAutenticado();
      const liberar = segurarRenovacao();

      let promessa;
      await act(async () => {
        promessa = dispararComRenovacaoEmVoo(store);
        await Promise.resolve();
      });
      await act(async () => {
        liberar(config =>
          responder(config, 200, {
            accessToken: 'tok-u9',
            user: { id: 'u9', nome: 'Outro' },
            configuracao: null,
          })
        );
        await promessa;
      });

      expect(reloadPage).toHaveBeenCalledTimes(1);
      expect(errorMock).not.toHaveBeenCalled();
      expect(store.getState().alunos.message).not.toBe(SEM_CONEXAO_MESSAGE);
      expect(logoutsFeitos()).toBe(0);
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });
});
