import React from 'react';
import { render, act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Footer } from './index';
import packageJson from '../../../../package.json';

describe('Footer', () => {
  it('renders current year and text', () => {
    const { getByText, container } = render(<Footer />);
    const ano = new Date().getFullYear();
    expect(getByText(new RegExp(`${ano}`))).toBeInTheDocument();
    expect(container.querySelector('footer')).toHaveClass('bg-secondary');
  });

  it('displays version from package.json', () => {
    const { getByText } = render(<Footer />);
    expect(getByText(`v${packageJson.version}`)).toBeInTheDocument();
  });

  it('renders copyright text', () => {
    const { getByText } = render(<Footer />);
    expect(getByText(/BLS Idiomas/i)).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('bg-secondary');
    expect(footer).toHaveClass('border-t');
    expect(footer).toHaveClass('border-main');
    expect(footer).toHaveClass('py-6');
  });
});

describe('Footer — ano estável até montar (AC-001-005)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('paridade SSR: renderToString não contém nenhum ano, independente do relógio', () => {
    jest.useFakeTimers();

    jest.setSystemTime(new Date('2026-12-31T23:59:59.000-03:00'));
    const htmlAntes = renderToString(<Footer />);

    jest.setSystemTime(new Date('2027-01-01T00:00:01.000-03:00'));
    const htmlDepois = renderToString(<Footer />);

    expect(htmlAntes).toBe(htmlDepois);
    expect(htmlAntes).not.toMatch(/202\d/);
  });

  it('preenchimento pós-montagem: ano nasce ausente e passa a refletir o relógio real', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-12-31T23:59:59.000-03:00'));

    // RTL `render()` embrulha o mount em `act()`, que assenta os efeitos
    // passivos sincronamente antes de retornar — tornaria o estado
    // pré-efeito inobservável. `flushSync` força o commit inicial de forma
    // síncrona e verificável (o ano ausente já visível no DOM) sem também
    // assentar o efeito passivo, que só roda no próximo flush de efeitos
    // (`act(async () => {...})` abaixo).
    const container = document.createElement('div');
    document.body.appendChild(container);
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const root = createRoot(container);

    flushSync(() => {
      root.render(<Footer />);
    });

    expect(container.textContent).not.toMatch(/202\d/);

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toMatch('2026');

    jest.setSystemTime(new Date('2027-01-01T00:00:01.000-03:00'));
    const root2Container = document.createElement('div');
    document.body.appendChild(root2Container);
    const root2 = createRoot(root2Container);
    flushSync(() => {
      root2.render(<Footer />);
    });
    expect(root2Container.textContent).not.toMatch(/202\d/);
    await act(async () => {
      await Promise.resolve();
    });
    expect(root2Container.textContent).toMatch('2027');

    act(() => {
      root.unmount();
      root2.unmount();
    });
    document.body.removeChild(container);
    document.body.removeChild(root2Container);
    consoleErrorSpy.mockRestore();
  });
});
