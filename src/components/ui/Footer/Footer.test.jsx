import React from 'react';
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { mountRaw } from '@/utils/mountRaw';
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

  it('applies correct styling classes', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('bg-secondary');
    expect(footer).toHaveClass('border-t');
    expect(footer).toHaveClass('border-main');
    expect(footer).toHaveClass('py-6');
  });
});

// (DEC-006-002 · demonstracao) AC-005-007/AC-005-001: nome lido do registro
// — com a marca padrão, idêntico ao literal de hoje.
describe('marca padrão', () => {
  it('renders copyright text', () => {
    const { getByText } = render(<Footer />);
    expect(getByText(/BLS Idiomas/i)).toBeInTheDocument();
  });
});

// (DEC-006-002 · demonstracao) AC-005-007/AC-005-002: módulo recarregado com
// NEXT_PUBLIC_MARCA=exemplo lê o nome da marca fictícia — molde
// `carregarConfig` de next.config.test.js:28-43, adaptado: `jest.isolateModules`
// troca o registro só para esta chamada, com `react` explicitamente
// realiasado à instância real já carregada pelo arquivo de teste (sem o
// alias, o dispatcher de hooks do React recarregado fica desconectado do
// `react-dom` usado por `render`, e `useState`/`useEffect` do Footer
// recarregado explodem com "Invalid hook call").
describe('marca fictícia', () => {
  const MARCA_ORIGINAL = process.env.NEXT_PUBLIC_MARCA;
  const reactReal = require('react');

  afterEach(() => {
    if (MARCA_ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_MARCA;
    else process.env.NEXT_PUBLIC_MARCA = MARCA_ORIGINAL;
  });

  it('mostra o nome da escola fictícia e nunca o da marca padrão', () => {
    process.env.NEXT_PUBLIC_MARCA = 'exemplo';
    let utils;
    jest.isolateModules(() => {
      jest.doMock('react', () => reactReal);
      const { Footer: FooterFicticia } = require('./index');
      utils = render(<FooterFicticia />);
    });
    const { getByText, queryByText } = utils;

    expect(getByText(/Escola Exemplo de Idiomas/i)).toBeInTheDocument();
    expect(queryByText(/BLS/i)).not.toBeInTheDocument();
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

    // `mountRaw` (ACH-10) — mesmo helper compartilhado das 5 suítes de hook,
    // aqui montando o componente diretamente (sem `Harness`).
    const footer1 = mountRaw(<Footer />);
    expect(footer1.container.textContent).not.toMatch(/202\d/);
    await footer1.flush();
    expect(footer1.container.textContent).toMatch('2026');

    jest.setSystemTime(new Date('2027-01-01T00:00:01.000-03:00'));
    const footer2 = mountRaw(<Footer />);
    expect(footer2.container.textContent).not.toMatch(/202\d/);
    await footer2.flush();
    expect(footer2.container.textContent).toMatch('2027');

    footer1.unmount();
    footer2.unmount();
  });
});
