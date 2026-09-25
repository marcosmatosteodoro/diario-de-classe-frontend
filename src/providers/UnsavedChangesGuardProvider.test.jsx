import React, { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import {
  UnsavedChangesGuardProvider,
  useUnsavedChangesGuard,
} from './UnsavedChangesGuardProvider';
import useSweetAlert from '@/hooks/useSweetAlert';

jest.mock('@/hooks/useSweetAlert', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Registra o guard com um valor de `isDirty` fixo, no padrão do consumidor
// real (`page.jsx`: `useEffect` chamando `setGuard(() => isDirty)` a cada
// mudança e `clearGuard()` no cleanup).
function ConsumidorComGuard({ dirty }) {
  const { setGuard, clearGuard } = useUnsavedChangesGuard();
  useEffect(() => {
    setGuard(() => dirty);
    return () => clearGuard();
  }, [dirty, setGuard, clearGuard]);
  return null;
}

// Expõe o valor devolvido por `useUnsavedChangesGuard()` para o teste sem
// reatribuir uma variável externa durante o render (side effect só em
// `useEffect`, nunca no corpo do componente).
function ExpoeGuard({ guardRef, children = null }) {
  const guard = useUnsavedChangesGuard();
  useEffect(() => {
    guardRef.current = guard;
  });
  return children;
}

describe('UnsavedChangesGuardProvider', () => {
  let showConfirmMock;

  beforeEach(() => {
    showConfirmMock = jest.fn();
    useSweetAlert.mockReturnValue({ showConfirm: showConfirmMock });
  });

  it('fora do provider, confirmNavigation() resolve true sem exibir diálogo, e setGuard/clearGuard não lançam', () => {
    const guardRef = { current: null };
    render(<ExpoeGuard guardRef={guardRef} />);

    expect(guardRef.current.confirmNavigation()).toBe(true);
    expect(showConfirmMock).not.toHaveBeenCalled();
    expect(() => guardRef.current.setGuard(() => true)).not.toThrow();
    expect(() => guardRef.current.clearGuard()).not.toThrow();
  });

  it('dentro do provider, sem guard registrado, confirmNavigation() resolve true sem exibir diálogo', () => {
    const guardRef = { current: null };
    render(
      <UnsavedChangesGuardProvider>
        <ExpoeGuard guardRef={guardRef} />
      </UnsavedChangesGuardProvider>
    );

    expect(guardRef.current.confirmNavigation()).toBe(true);
    expect(showConfirmMock).not.toHaveBeenCalled();
  });

  it('com guard registrado e isDirty=true, confirmNavigation() exibe o diálogo e resolve true quando confirmado', async () => {
    showConfirmMock.mockResolvedValue({ isConfirmed: true });
    const guardRef = { current: null };
    render(
      <UnsavedChangesGuardProvider>
        <ExpoeGuard guardRef={guardRef}>
          <ConsumidorComGuard dirty={true} />
        </ExpoeGuard>
      </UnsavedChangesGuardProvider>
    );

    const resultado = guardRef.current.confirmNavigation();
    // Com alteração pendente, o resultado é uma Promise (nunca `true`
    // síncrono) — é o sinal para o consumidor interceptar a navegação.
    expect(resultado).not.toBe(true);
    expect(showConfirmMock).toHaveBeenCalledTimes(1);

    await expect(resultado).resolves.toBe(true);
  });

  it('com guard registrado e isDirty=true, confirmNavigation() resolve false quando o administrador cancela', async () => {
    showConfirmMock.mockResolvedValue({ isConfirmed: false });
    const guardRef = { current: null };
    render(
      <UnsavedChangesGuardProvider>
        <ExpoeGuard guardRef={guardRef}>
          <ConsumidorComGuard dirty={true} />
        </ExpoeGuard>
      </UnsavedChangesGuardProvider>
    );

    await expect(guardRef.current.confirmNavigation()).resolves.toBe(false);
  });

  describe('beforeunload', () => {
    it('com isDirty=true, o listener intercepta o fechamento (controle positivo de preventDefault/returnValue)', () => {
      render(
        <UnsavedChangesGuardProvider>
          <ConsumidorComGuard dirty={true} />
        </UnsavedChangesGuardProvider>
      );

      const evento = new Event('beforeunload', { cancelable: true });
      act(() => {
        window.dispatchEvent(evento);
      });

      expect(evento.defaultPrevented).toBe(true);
      // jsdom implementa `returnValue` como alias legado de
      // `defaultPrevented` (getter devolve booleano, nunca a string
      // atribuída) — atribuir `''` (falsy) é o que efetivamente cancela o
      // evento; por isso o controle positivo aqui é o mesmo booleano.
      expect(evento.returnValue).toBe(false);
    });

    it('sem isDirty, o listener não é registrado — beforeunload segue sem interceptar', () => {
      render(
        <UnsavedChangesGuardProvider>
          <ConsumidorComGuard dirty={false} />
        </UnsavedChangesGuardProvider>
      );

      const evento = new Event('beforeunload', { cancelable: true });
      act(() => {
        window.dispatchEvent(evento);
      });

      expect(evento.defaultPrevented).toBe(false);
    });

    it('é removido quando isDirty volta a false', () => {
      const { rerender } = render(
        <UnsavedChangesGuardProvider>
          <ConsumidorComGuard dirty={true} />
        </UnsavedChangesGuardProvider>
      );

      let evento = new Event('beforeunload', { cancelable: true });
      act(() => {
        window.dispatchEvent(evento);
      });
      expect(evento.defaultPrevented).toBe(true);

      act(() => {
        rerender(
          <UnsavedChangesGuardProvider>
            <ConsumidorComGuard dirty={false} />
          </UnsavedChangesGuardProvider>
        );
      });

      evento = new Event('beforeunload', { cancelable: true });
      act(() => {
        window.dispatchEvent(evento);
      });
      expect(evento.defaultPrevented).toBe(false);
    });

    it('é removido no unmount do componente', () => {
      const { unmount } = render(
        <UnsavedChangesGuardProvider>
          <ConsumidorComGuard dirty={true} />
        </UnsavedChangesGuardProvider>
      );

      act(() => {
        unmount();
      });

      const evento = new Event('beforeunload', { cancelable: true });
      act(() => {
        window.dispatchEvent(evento);
      });
      expect(evento.defaultPrevented).toBe(false);
    });
  });
});
