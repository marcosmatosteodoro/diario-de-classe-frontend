import fs from 'fs';
import path from 'path';

const ORIGIN = 'https://app.test';
const VERSION = 'v-teste';

function carregarSw() {
  const listeners = {};
  const addEventListener = jest.fn((tipo, fn) => {
    listeners[tipo] = fn;
  });
  const cacheSimulado = {
    match: jest.fn(async chave =>
      chave === '/offline.html' ? 'RESPOSTA_OFFLINE' : 'RESPOSTA_DO_CACHE'
    ),
    put: jest.fn(async () => {}),
    addAll: jest.fn(async () => {}),
  };
  const caches = {
    open: jest.fn(async () => cacheSimulado),
    keys: jest.fn(async () => []),
    delete: jest.fn(async () => true),
  };
  const self = {
    location: new URL(`${ORIGIN}/sw.js?v=${VERSION}`),
    addEventListener,
  };
  const fetchSimulado = jest.fn(async () => ({ ok: false }));
  const codigo = fs.readFileSync(
    path.join(process.cwd(), 'public', 'sw.js'),
    'utf8'
  );
  new Function('self', 'caches', 'fetch', 'Response', codigo)(
    self,
    caches,
    fetchSimulado,
    { error: () => 'RESPOSTA_ERRO' }
  );
  return { listeners, addEventListener, caches, cacheSimulado, fetchSimulado };
}

function dispararFetch(sw, { method = 'GET', url, mode = 'cors' }) {
  const respondWith = jest.fn();
  sw.listeners.fetch({
    request: { method, url: `${ORIGIN}${url}`, mode },
    respondWith,
  });
  return respondWith;
}

describe('public/sw.js — fetch handler', () => {
  let sw;
  beforeEach(() => {
    sw = carregarSw();
  });

  it('o ambiente simulado é real: fetch registrado e versão do ?v= em uso', async () => {
    expect(sw.addEventListener).toHaveBeenCalledWith(
      'fetch',
      expect.any(Function)
    );
    const respondWith = dispararFetch(sw, { url: '/_next/static/chunk.js' });
    await respondWith.mock.calls[0][0];
    expect(sw.caches.open).toHaveBeenCalledWith(`bls-diario-static-${VERSION}`);
  });

  describe.each([
    ['GET cors em /api/auth/refresh-token', { url: '/api/auth/refresh-token' }],
    ['GET cors em /api/alunos', { url: '/api/alunos' }],
    ['navegação em /api/alunos', { url: '/api/alunos', mode: 'navigate' }],
  ])('não responde a /api/: %s', (_nome, req) => {
    it('sem respondWith e sem abrir cache', () => {
      const respondWith = dispararFetch(sw, req);
      expect(respondWith).not.toHaveBeenCalled();
      expect(sw.caches.open).not.toHaveBeenCalled();
    });
  });

  it('controle: GET em /_next/static/ responde cache-first', async () => {
    const respondWith = dispararFetch(sw, { url: '/_next/static/chunk.js' });
    expect(respondWith).toHaveBeenCalledTimes(1);
    expect(await respondWith.mock.calls[0][0]).toBe('RESPOSTA_DO_CACHE');
    expect(sw.caches.open).toHaveBeenCalled();
  });

  it('controle: GET em item do precache responde', () => {
    const respondWith = dispararFetch(sw, { url: '/icon-192.png' });
    expect(respondWith).toHaveBeenCalledTimes(1);
  });

  it('controle: navegação em /alunos responde', () => {
    const respondWith = dispararFetch(sw, { url: '/alunos', mode: 'navigate' });
    expect(respondWith).toHaveBeenCalledTimes(1);
  });

  it('não-regressão: POST /api/auth/login segue sem respondWith', () => {
    const respondWith = dispararFetch(sw, {
      method: 'POST',
      url: '/api/auth/login',
    });
    expect(respondWith).not.toHaveBeenCalled();
  });

  it('não-regressão: navegação offline entrega o fallback de /offline.html', async () => {
    sw.fetchSimulado.mockRejectedValueOnce(new Error('offline'));
    const respondWith = dispararFetch(sw, { url: '/alunos', mode: 'navigate' });
    expect(await respondWith.mock.calls[0][0]).toBe('RESPOSTA_OFFLINE');
  });
});
