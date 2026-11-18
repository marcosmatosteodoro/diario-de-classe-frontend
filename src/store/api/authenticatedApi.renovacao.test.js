import { AxiosError } from 'axios';
import { RENEW_FAILURE_MESSAGE, SESSION_EVENT } from '@/constants/session';
import {
  getRequestErrorMessage,
  SEM_CONEXAO_MESSAGE,
  thunkErrorPayload,
} from '@/utils/thunkErrorPayload';
import { reloadPage } from '@/utils/reloadPage';
import { AlunoApi } from './alunoApi';
import { AuthApi } from './authApi';
import { LivroApi } from './livroApi';
import {
  clearSession,
  getAccessToken,
  getSessionEpoch,
  renew,
  setSession,
  subscribe,
} from './sessionManager';

jest.mock('@/utils/reloadPage');

function resposta(config, status, data = {}) {
  return { status, data, config, headers: {}, statusText: '' };
}

// Adaptador simulado: `fila` é uma fila de respostas por chamada; cada
// chamada registra o que chegou ao destino (cabeçalho, corpo, responseType).
function instalarAdaptador(api, fila) {
  const chamadas = [];
  api.api.defaults.adapter = jest.fn(async config => {
    chamadas.push({
      url: config.url,
      method: config.method,
      authorization: config.headers.get('Authorization') ?? null,
      contentType: config.headers.get('Content-Type') ?? null,
      data: config.data,
      responseType: config.responseType,
    });
    const proxima =
      typeof fila === 'function' ? fila(chamadas.length) : fila.shift();
    const { status, data } = proxima;
    const res = resposta(config, status, data);
    if (status >= 200 && status < 300) return res;
    throw new AxiosError('falha', 'ERR_BAD_REQUEST', config, null, res);
  });
  return chamadas;
}

function erroDeRede() {
  return new AxiosError('Network Error', 'ERR_NETWORK');
}

describe('AuthenticatedApi: renovação transparente', () => {
  let renovar;
  let expirou;
  let cancelar;

  beforeEach(() => {
    clearSession();
    setSession({ accessToken: 'velho', userId: 'u1' });
    renovar = jest.spyOn(AuthApi.prototype, 'refreshToken').mockResolvedValue({
      data: { accessToken: 'novo', user: { id: 'u1' }, configuracao: null },
    });
    expirou = jest.fn();
    cancelar = subscribe(SESSION_EVENT.EXPIRED, expirou);
    jest.mocked(reloadPage).mockClear();
  });

  afterEach(() => {
    cancelar();
    renovar.mockRestore();
    clearSession();
  });

  it('401 renova uma vez e repete a original com o acesso novo (AC-002-005)', async () => {
    const api = new AlunoApi();
    const chamadas = instalarAdaptador(api, [
      { status: 401 },
      { status: 200, data: { ok: true } },
    ]);

    const res = await api.getAulasByAluno('a1');

    expect(res.data).toEqual({ ok: true });
    expect(renovar).toHaveBeenCalledTimes(1);
    expect(chamadas.map(c => c.authorization)).toEqual([
      'Bearer velho',
      'Bearer novo',
    ]);
    expect(getAccessToken()).toBe('novo');
    expect(expirou).not.toHaveBeenCalled();
  });

  describe('consolidação (AC-002-006)', () => {
    it('três 401 simultâneos geram uma só renovação e as três repetem', async () => {
      const api = new AlunoApi();
      const chamadas = instalarAdaptador(api, n =>
        n <= 3 ? { status: 401 } : { status: 200, data: { n } }
      );

      const resultados = await Promise.all([
        api.getAulasByAluno('a1'),
        api.getAulasByAluno('a2'),
        api.getAulasByAluno('a3'),
      ]);

      expect(resultados).toHaveLength(3);
      expect(renovar).toHaveBeenCalledTimes(1);
      expect(chamadas.slice(3).map(c => c.authorization)).toEqual([
        'Bearer novo',
        'Bearer novo',
        'Bearer novo',
      ]);
    });

    it('401 tardio com o acesso antigo repete direto, sem nova renovação', async () => {
      const api = new AlunoApi();
      let liberar;
      const travada = new Promise(r => (liberar = r));
      const chamadas = [];
      api.api.defaults.adapter = jest.fn(async config => {
        const auth = config.headers.get('Authorization') ?? null;
        chamadas.push(auth);
        if (auth === 'Bearer velho') {
          if (config.url.includes('tardia')) await travada;
          throw new AxiosError('x', 'E', config, null, resposta(config, 401));
        }
        return resposta(config, 200, {});
      });

      const tardia = api.get('/tardia');
      await api.get('/rapida');
      expect(renovar).toHaveBeenCalledTimes(1);
      liberar();
      await tardia;

      expect(renovar).toHaveBeenCalledTimes(1);
      expect(chamadas.filter(a => a === 'Bearer novo')).toHaveLength(2);
    });
  });

  describe('sem laço e recusa (AC-002-030, AC-002-007)', () => {
    it('repetição que volta 401 não renova de novo, limpa a sessão e marca sessionExpired', async () => {
      const api = new AlunoApi();
      const chamadas = instalarAdaptador(api, n =>
        n <= 2 ? { status: 401 } : { status: 200 }
      );

      await expect(api.getAulasByAluno('a1')).rejects.toMatchObject({
        sessionExpired: true,
      });

      expect(chamadas).toHaveLength(2);
      expect(renovar).toHaveBeenCalledTimes(1);
      expect(getAccessToken()).toBeNull();
      expect(expirou).toHaveBeenCalledTimes(1);
    });

    it.each([401, 403])(
      'renovação recusada com %s encerra a sessão sem repetir',
      async status => {
        renovar.mockRejectedValue(
          new AxiosError('x', 'E', {}, null, resposta({}, status))
        );
        const api = new AlunoApi();
        const chamadas = instalarAdaptador(api, () => ({ status: 401 }));

        await expect(api.getAulasByAluno('a1')).rejects.toMatchObject({
          sessionExpired: true,
        });

        expect(chamadas).toHaveLength(1);
        expect(getAccessToken()).toBeNull();
        expect(expirou).toHaveBeenCalledTimes(1);
      }
    );

    it('três simultâneas recusadas emitem EXPIRED uma vez', async () => {
      renovar.mockRejectedValue(
        new AxiosError('x', 'E', {}, null, resposta({}, 401))
      );
      const api = new AlunoApi();
      instalarAdaptador(api, () => ({ status: 401 }));

      const r = await Promise.allSettled([
        api.get('/a'),
        api.get('/b'),
        api.get('/c'),
      ]);

      expect(r.every(x => x.reason.sessionExpired === true)).toBe(true);
      expect(expirou).toHaveBeenCalledTimes(1);
    });

    it('renovação 200 e as três repetições 401: EXPIRED e época sobem uma vez', async () => {
      const api = new AlunoApi();
      instalarAdaptador(api, n => (n <= 6 ? { status: 401 } : { status: 200 }));
      const epoca = getSessionEpoch();

      const r = await Promise.allSettled([
        api.get('/a'),
        api.get('/b'),
        api.get('/c'),
      ]);

      expect(r.every(x => x.reason.sessionExpired === true)).toBe(true);
      expect(renovar).toHaveBeenCalledTimes(1);
      expect(expirou).toHaveBeenCalledTimes(1);
      expect(getSessionEpoch()).toBe(epoca + 1);
    });
  });

  describe('401 sem acesso em memória (FR-002-009)', () => {
    it('não renova, não emite e rejeita com o 401 original', async () => {
      clearSession();
      const api = new AlunoApi();
      instalarAdaptador(api, () => ({ status: 401 }));

      const erro = await api.get('/x').catch(e => e);

      expect(erro.response.status).toBe(401);
      expect(erro.sessionExpired).toBeUndefined();
      expect(renovar).not.toHaveBeenCalled();
      expect(expirou).not.toHaveBeenCalled();
    });

    it('requisição sem Authorization com acesso presente na mesma época repete direto (comparação ?? null)', async () => {
      clearSession();
      const api = new AlunoApi();
      let liberar;
      const travada = new Promise(r => (liberar = r));
      const chamadas = [];
      api.api.defaults.adapter = jest.fn(async config => {
        chamadas.push(config.headers.get('Authorization') ?? null);
        if (chamadas.length === 1) {
          await travada;
          throw new AxiosError('x', 'E', config, null, resposta(config, 401));
        }
        return resposta(config, 200, {});
      });

      const pendente = api.get('/x');
      await Promise.resolve();
      setSession({ accessToken: 'velho', userId: 'u1' });
      liberar();
      await pendente;

      expect(renovar).not.toHaveBeenCalled();
      expect(chamadas).toEqual([null, 'Bearer velho']);
    });
  });

  describe('troca de sessão durante a requisição (FR-002-019, TRISK-003-012)', () => {
    function emVoo(api) {
      let liberar;
      const travada = new Promise(r => (liberar = r));
      const chamadas = [];
      api.api.defaults.adapter = jest.fn(async config => {
        chamadas.push(config.headers.get('Authorization') ?? null);
        if (chamadas.length === 1) {
          await travada;
          throw new AxiosError('x', 'E', config, null, resposta(config, 401));
        }
        return resposta(config, 200, {});
      });
      return { chamadas, liberar };
    }

    it('401 de requisição da sessão anterior não repete nem renova e rejeita com sessaoTrocada', async () => {
      const api = new AlunoApi();
      const { chamadas, liberar } = emVoo(api);

      const pendente = api.get('/x').catch(e => e);
      await Promise.resolve();
      clearSession();
      setSession({ accessToken: 'do-u2', userId: 'u2' });
      liberar();
      const erro = await pendente;

      expect(chamadas).toHaveLength(1);
      expect(renovar).not.toHaveBeenCalled();
      expect(erro.sessaoTrocada).toBe(true);
      expect(erro.sessionExpired).toBeUndefined();
      expect(erro.response?.status).toBeUndefined();
      expect(expirou).not.toHaveBeenCalled();
      expect(getAccessToken()).toBe('do-u2');
    });

    it('controle: acesso trocado por renew() na mesma época repete uma vez com o acesso novo', async () => {
      const api = new AlunoApi();
      const { chamadas, liberar } = emVoo(api);

      const pendente = api.get('/x');
      await Promise.resolve();
      await renew();
      liberar();
      await pendente;

      expect(renovar).toHaveBeenCalledTimes(1);
      expect(chamadas).toEqual(['Bearer velho', 'Bearer novo']);
    });
  });

  describe('renovação com falha não-recusa (gate 11)', () => {
    it('5xx na renovação leva ao slice a copy do produto, não a do endpoint auxiliar', async () => {
      renovar.mockRejectedValue(
        new AxiosError(
          'x',
          'E',
          {},
          null,
          resposta({}, 500, { message: 'Erro ao renovar token' })
        )
      );
      const api = new AlunoApi();
      instalarAdaptador(api, () => ({ status: 401 }));

      const erro = await api.get('/x').catch(e => e);

      expect(erro.response.status).toBe(500);
      expect(getRequestErrorMessage(erro, 'fallback')).toBe(
        RENEW_FAILURE_MESSAGE
      );
      expect(thunkErrorPayload(erro, 'fallback')).toMatchObject({
        message: RENEW_FAILURE_MESSAGE,
        statusError: 500,
      });
    });
  });

  describe('nada de renovação indevida (AC-002-031)', () => {
    it.each([403, 404, 500])('%s não renova', async status => {
      const api = new AlunoApi();
      instalarAdaptador(api, () => ({ status }));

      await expect(api.get('/x')).rejects.toMatchObject({
        response: { status },
      });

      expect(renovar).not.toHaveBeenCalled();
      expect(getAccessToken()).toBe('velho');
      expect(expirou).not.toHaveBeenCalled();
    });

    it('login com 401 não renova e AuthApi não tem interceptor de resposta', async () => {
      const auth = new AuthApi();
      instalarAdaptador(auth, () => ({ status: 401 }));
      renovar.mockClear();

      await expect(auth.login({})).rejects.toMatchObject({
        response: { status: 401 },
      });

      expect(renovar).not.toHaveBeenCalled();
      expect(auth.api.interceptors.response.handlers).toHaveLength(0);
    });
  });

  describe('falha de comunicação não é sessão expirada (AC-002-026)', () => {
    it('renovação sem resposta: erro sem response, mensagem de conexão, sessão intacta', async () => {
      const falha = erroDeRede();
      renovar.mockRejectedValue(falha);
      const api = new AlunoApi();
      instalarAdaptador(api, () => ({ status: 401 }));

      const erro = await api.get('/x').catch(e => e);

      expect(erro.response).toBeUndefined();
      expect(getRequestErrorMessage(erro, 'x')).toBe(SEM_CONEXAO_MESSAGE);
      expect(expirou).not.toHaveBeenCalled();
      expect(getAccessToken()).toBe('velho');
    });

    it.each([500, 400])(
      'renovação com %s rejeita com o erro dela, sem encerrar a sessão',
      async status => {
        renovar.mockRejectedValue(
          new AxiosError('x', 'E', {}, null, resposta({}, status))
        );
        const api = new AlunoApi();
        instalarAdaptador(api, () => ({ status: 401 }));

        const erro = await api.get('/x').catch(e => e);

        expect(erro.response.status).toBe(status);
        expect(erro.sessionExpired).toBeUndefined();
        expect(expirou).not.toHaveBeenCalled();
        expect(getAccessToken()).toBe('velho');
      }
    );
  });

  describe('identidade diferente (AC-002-024)', () => {
    it('não repete, emite o evento, recarrega e rejeita sem response', async () => {
      renovar.mockResolvedValue({
        data: { accessToken: 'novo', user: { id: 'u2' }, configuracao: null },
      });
      const mudou = jest.fn();
      const cancelarId = subscribe(SESSION_EVENT.IDENTITY_CHANGED, mudou);
      const api = new AlunoApi();
      const chamadas = instalarAdaptador(api, () => ({ status: 401 }));

      const erro = await api.get('/x').catch(e => e);
      cancelarId();

      expect(chamadas).toHaveLength(1);
      expect(mudou).toHaveBeenCalledTimes(1);
      expect(reloadPage).toHaveBeenCalledTimes(1);
      expect(erro.identidadeAlterada).toBe(true);
      expect(erro.response).toBeUndefined();
      expect(getAccessToken()).not.toBe('novo');
    });

    it('mesma identidade não recarrega (controle)', async () => {
      const api = new AlunoApi();
      instalarAdaptador(api, n =>
        n === 1 ? { status: 401 } : { status: 200 }
      );

      await api.get('/x');

      expect(reloadPage).not.toHaveBeenCalled();
    });
  });

  describe('uploads e download preservados (AC-002-029, AC-002-032)', () => {
    function formData() {
      const fd = new FormData();
      fd.append('file', new Blob(['abc']), 'lista.xlsx');
      return fd;
    }

    it.each([
      [
        'AlunoApi.uploadAlunoList',
        () => new AlunoApi(),
        (api, fd) => api.uploadAlunoList(fd),
      ],
      [
        'LivroApi.uploadConteudos',
        () => new LivroApi(),
        (api, fd) => api.uploadConteudos('l1', fd),
      ],
    ])(
      '%s repete o mesmo FormData sem JSON e restaura o Content-Type',
      async (_n, criar, enviar) => {
        const api = criar();
        const chamadas = instalarAdaptador(api, n =>
          n === 1 ? { status: 401 } : { status: 200 }
        );
        const fd = formData();

        await enviar(api, fd);

        expect(chamadas).toHaveLength(2);
        expect(chamadas[0].data).toBe(fd);
        expect(chamadas[1].data).toBe(fd);
        expect(Array.from(chamadas[1].data.entries())).toEqual(
          Array.from(fd.entries())
        );
        chamadas.forEach(c =>
          expect(c.contentType ?? '').not.toContain('application/json')
        );
        expect(api.api.defaults.headers['Content-Type']).toBe(
          'application/json'
        );
      }
    );

    it('download repete com responseType blob e devolve o Blob da repetição', async () => {
      const api = new AlunoApi();
      const blob = new Blob(['xlsx']);
      const chamadas = instalarAdaptador(api, n =>
        n === 1 ? { status: 401 } : { status: 200, data: blob }
      );

      const res = await api.downloadCronogramaExcel('a1');

      expect(chamadas.map(c => c.responseType)).toEqual(['blob', 'blob']);
      expect(res.data).toBe(blob);
    });
  });
});
