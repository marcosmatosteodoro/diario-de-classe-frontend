import { LogoutService } from '@/services/auth/logoutService';
import * as canal from './sessionChannel';

jest.mock('@/services/auth/logoutService', () => ({
  LogoutService: { handle: jest.fn() },
}));

const {
  SESSION_CHANNEL_EVENT,
  PENDING_EXIT_KEY,
  markPendingExit,
  hasPendingExit,
  clearPendingExit,
  retryPendingExit,
  watchPendingExit,
} = canal;

const ORIGINAL_BC = global.BroadcastChannel;

// Simula o comportamento real: a mensagem chega às OUTRAS instâncias de
// mesmo nome (inclusive na própria aba), nunca ao objeto remetente.
class FakeBroadcastChannel {
  static instances = [];
  static constructed = 0;
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    this.closed = false;
    FakeBroadcastChannel.constructed += 1;
    FakeBroadcastChannel.instances.push(this);
  }
  postMessage(data) {
    FakeBroadcastChannel.instances
      .filter(i => i !== this && i.name === this.name && !i.closed)
      .forEach(i => i.onmessage && i.onmessage({ data }));
  }
  close() {
    this.closed = true;
  }
}

// Segunda cópia do módulo = outra aba (outra origem de eco).
function carregarOutraAba() {
  let outra;
  jest.isolateModules(() => {
    outra = require('./sessionChannel');
  });
  return outra;
}

describe('sessionChannel — canal entre abas', () => {
  beforeEach(() => {
    localStorage.clear();
    FakeBroadcastChannel.instances = [];
    FakeBroadcastChannel.constructed = 0;
  });
  afterEach(() => {
    global.BroadcastChannel = ORIGINAL_BC;
    jest.restoreAllMocks();
  });

  it('exporta as constantes do contrato', () => {
    expect(SESSION_CHANNEL_EVENT).toEqual({ SAIDA: 'saida' });
    expect(PENDING_EXIT_KEY).toBe('bls-saida-pendente');
  });

  it('com BroadcastChannel: a outra aba recebe `saida` 1 vez e o cancelamento a silencia', () => {
    global.BroadcastChannel = FakeBroadcastChannel;
    expect(typeof BroadcastChannel).toBe('function');
    expect(BroadcastChannel).toBe(FakeBroadcastChannel);

    const outraAba = carregarOutraAba();
    const callback = jest.fn();
    const cancelar = outraAba.onSessionEvent(callback);

    canal.postSessionEvent('saida');
    expect(FakeBroadcastChannel.constructed).toBeGreaterThanOrEqual(2);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('saida');

    cancelar();
    canal.postSessionEvent('saida');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('com BroadcastChannel: a aba que envia não reage ao próprio evento', () => {
    global.BroadcastChannel = FakeBroadcastChannel;
    const callback = jest.fn();
    const cancelar = canal.onSessionEvent(callback);

    canal.postSessionEvent('saida');

    expect(callback).not.toHaveBeenCalled();
    cancelar();
  });

  it('com BroadcastChannel: a mensagem não carrega credencial', () => {
    global.BroadcastChannel = FakeBroadcastChannel;
    const recebidas = [];
    const escuta = new FakeBroadcastChannel('bls-sessao');
    escuta.onmessage = e => recebidas.push(e.data);

    canal.postSessionEvent('saida');

    expect(recebidas).toHaveLength(1);
    expect(Object.keys(recebidas[0]).sort()).toEqual([
      'carimbo',
      'origem',
      'tipo',
    ]);
    expect(JSON.stringify(recebidas[0])).not.toMatch(/token|senha|bearer/i);
  });

  describe('fallback pelo evento storage', () => {
    beforeEach(() => {
      delete global.BroadcastChannel;
    });

    it('sem BroadcastChannel: grava só tipo e carimbo e o StorageEvent chama o callback 1 vez', () => {
      expect(typeof BroadcastChannel).toBe('undefined');
      const callback = jest.fn();
      const cancelar = canal.onSessionEvent(callback);

      canal.postSessionEvent('saida');
      const valor = localStorage.getItem('bls-sessao-evento');
      expect(Object.keys(JSON.parse(valor)).sort()).toEqual([
        'carimbo',
        'tipo',
      ]);
      expect(valor).not.toMatch(/token|senha|bearer/i);
      // o navegador não dispara `storage` na aba que gravou
      expect(callback).not.toHaveBeenCalled();

      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'bls-sessao-evento',
          newValue: JSON.stringify({ tipo: 'saida', carimbo: 1 }),
        })
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('saida');

      cancelar();
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'bls-sessao-evento',
          newValue: JSON.stringify({ tipo: 'saida', carimbo: 2 }),
        })
      );
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('ignora storage de outra chave e remoção (newValue null)', () => {
      const callback = jest.fn();
      const cancelar = canal.onSessionEvent(callback);

      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'outra-chave',
          newValue: JSON.stringify({ tipo: 'saida', carimbo: 1 }),
        })
      );
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'bls-sessao-evento',
          newValue: null,
        })
      );
      expect(callback).not.toHaveBeenCalled();

      // controle positivo: o mesmo ouvinte reage à chave certa
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'bls-sessao-evento',
          newValue: JSON.stringify({ tipo: 'saida', carimbo: 3 }),
        })
      );
      expect(callback).toHaveBeenCalledTimes(1);
      cancelar();
    });
  });

  // Ramo SSR (`typeof window === 'undefined'`) não é provável neste runner:
  // `window` não é configurável no jsdom.
  it('importar o módulo não toca localStorage', () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem');
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    jest.isolateModules(() => {
      require('./sessionChannel');
    });
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    // controle positivo: o espião enxerga chamada direta
    localStorage.getItem('x');
    expect(getItem).toHaveBeenCalledTimes(1);
  });
});

describe('sessionChannel — saída pendente', () => {
  let onLine;
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    onLine = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });
  afterEach(() => {
    onLine.mockRestore();
  });

  it('markPendingExit grava a chave e hasPendingExit deriva da presença', () => {
    expect(hasPendingExit()).toBe(false);
    markPendingExit();
    expect(localStorage.getItem('bls-saida-pendente')).not.toBeNull();
    expect(hasPendingExit()).toBe(true);
    clearPendingExit();
    expect(hasPendingExit()).toBe(false);
  });

  it.each(['0', 'false', '', 'null'])(
    'hasPendingExit é true para o valor armazenado %p',
    valor => {
      localStorage.setItem('bls-saida-pendente', valor);
      expect(hasPendingExit()).toBe(true);
    }
  );

  it('retryPendingExit com 204 chama o service sem argumento e remove a marca', async () => {
    markPendingExit();
    LogoutService.handle.mockResolvedValue({ status: 204 });
    await retryPendingExit();
    expect(LogoutService.handle).toHaveBeenCalledTimes(1);
    expect(LogoutService.handle.mock.calls[0]).toHaveLength(0);
    expect(hasPendingExit()).toBe(false);
  });

  it.each([
    ['sem response', { message: 'Network Error' }],
    ['500', { response: { status: 500 } }],
    ['403', { response: { status: 403 } }],
  ])('retryPendingExit com falha %s mantém a marca', async (_, erro) => {
    markPendingExit();
    LogoutService.handle.mockRejectedValue(erro);
    await retryPendingExit();
    expect(LogoutService.handle).toHaveBeenCalledTimes(1);
    expect(hasPendingExit()).toBe(true);
  });

  it('retryPendingExit sem marca não chama o service (com controle positivo)', async () => {
    LogoutService.handle.mockResolvedValue({ status: 204 });
    await retryPendingExit();
    expect(LogoutService.handle).not.toHaveBeenCalled();
    markPendingExit();
    await retryPendingExit();
    expect(LogoutService.handle).toHaveBeenCalledTimes(1);
  });

  it('watchPendingExit online repete ao ser chamada, 1 vez', () => {
    markPendingExit();
    LogoutService.handle.mockResolvedValue({ status: 204 });
    const cancelar = watchPendingExit();
    expect(LogoutService.handle).toHaveBeenCalledTimes(1);
    cancelar();
  });

  it('watchPendingExit offline espera o evento online; cancelado, não repete mais', async () => {
    onLine.mockReturnValue(false);
    markPendingExit();
    LogoutService.handle.mockRejectedValue({ message: 'Network Error' });
    const cancelar = watchPendingExit();
    expect(LogoutService.handle).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('online'));
    expect(LogoutService.handle).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await Promise.resolve();

    cancelar();
    window.dispatchEvent(new Event('online'));
    expect(LogoutService.handle).toHaveBeenCalledTimes(1);
  });

  it('evento online sem marca não repete (com controle positivo)', () => {
    onLine.mockReturnValue(false);
    LogoutService.handle.mockResolvedValue({ status: 204 });
    const cancelar = watchPendingExit();
    window.dispatchEvent(new Event('online'));
    expect(LogoutService.handle).not.toHaveBeenCalled();

    markPendingExit();
    window.dispatchEvent(new Event('online'));
    expect(LogoutService.handle).toHaveBeenCalledTimes(1);
    cancelar();
  });
});
