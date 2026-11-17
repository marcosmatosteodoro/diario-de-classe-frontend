jest.mock('@/store/api/authApi');

const SENTINELA = 'SENTINELA-ACESSO-9f3a';
const RESPOSTA = {
  data: {
    user: { id: 'u-1', nome: 'Ana', sobrenome: 'Lima', permissao: 'admin' },
    configuracao: { duracaoAula: 40, tolerancia: 10, diasDeFuncionamento: [] },
    accessToken: SENTINELA,
    tokenType: 'Bearer',
    expiresIn: 900,
  },
};

function contem(valor) {
  return JSON.stringify(valor).includes(SENTINELA);
}

// Carrega o store REAL (src/store/index.js) com um middleware de captura
// injetado na configureStore, e o slice no mesmo registro de módulos.
function carregar(nodeEnv = 'test') {
  const actions = [];
  const opcoes = {};
  let api;
  let slice;
  let sessao;
  let store;
  const env = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  jest.isolateModules(() => {
    jest.doMock('@reduxjs/toolkit', () => {
      const real = jest.requireActual('@reduxjs/toolkit');
      return {
        ...real,
        configureStore: config => {
          Object.assign(opcoes, config);
          const capturar = () => next => action => {
            actions.push(action);
            return next(action);
          };
          return real.configureStore({
            ...config,
            middleware: gdm => gdm().concat(capturar),
          });
        },
      };
    });
    api = require('@/store/api/authApi').AuthApi;
    sessao = require('@/store/api/sessionManager');
    slice = require('@/store/slices/authSlice');
    store = require('@/store/index').store;
  });
  process.env.NODE_ENV = env;
  return { actions, opcoes, api, slice, sessao, store };
}

describe('store real: o accessToken nunca transita pelo Redux', () => {
  it('controle positivo: o varredor acha o sentinela posto de propósito', () => {
    expect(contem({ type: 'x', payload: { accessToken: SENTINELA } })).toBe(
      true
    );
    expect(contem({ type: 'x', payload: { user: 1 } })).toBe(false);
  });

  it('login e sair (sucesso e rejeitado): nenhuma action nem getState() carrega o sentinela', async () => {
    const { actions, api, slice, sessao, store } = carregar();
    api.prototype.login = jest.fn().mockResolvedValue(RESPOSTA);
    api.prototype.logout = jest
      .fn()
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce(new Error('falha'));
    const estados = [];

    await store.dispatch(slice.login({ email: 'a@a.com', senha: '1' }));
    estados.push(store.getState());
    expect(sessao.getAccessToken()).toBe(SENTINELA);
    expect(store.getState().auth.data).toEqual({
      user: RESPOSTA.data.user,
      configuracao: RESPOSTA.data.configuracao,
    });

    await store.dispatch(slice.logout());
    estados.push(store.getState());
    await store.dispatch(slice.login({ email: 'a@a.com', senha: '1' }));
    await store.dispatch(slice.logout());
    estados.push(store.getState());

    expect(store.getState().auth.status).toBe('failed');
    expect(store.getState().auth.data).toBeNull();
    expect(actions.some(a => a.type === slice.login.fulfilled.type)).toBe(true);
    expect(actions.some(a => a.type === slice.logout.rejected.type)).toBe(true);
    actions.forEach(a => expect(contem(a)).toBe(false));
    estados.forEach(e => expect(contem(e)).toBe(false));
  });

  it.each([
    ['production', false],
    ['development', true],
    ['test', true],
  ])('devTools com NODE_ENV=%s é %s', (nodeEnv, esperado) => {
    expect(carregar(nodeEnv).opcoes.devTools).toBe(esperado);
  });
});
