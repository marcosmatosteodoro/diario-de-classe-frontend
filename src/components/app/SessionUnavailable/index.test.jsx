import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionUnavailable } from './index';
import { SessionUnavailable as DoBarrel } from '@/components/app';
import { SEM_CONEXAO_MESSAGE } from '@/utils/thunkErrorPayload';

describe('SessionUnavailable (FR-002-020)', () => {
  it('mostra título, o texto de conexão existente e o botão acessível', () => {
    render(<SessionUnavailable onRetry={jest.fn()} />);

    expect(
      screen.getByRole('heading', { name: 'Sessão indisponível' })
    ).toBeInTheDocument();
    expect(screen.getByText(SEM_CONEXAO_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' })
    ).toBeInTheDocument();
  });

  it('o título declara o token de cor text-main (contraste AA nos dois temas)', () => {
    render(<SessionUnavailable onRetry={jest.fn()} />);
    expect(
      screen.getByRole('heading', { name: 'Sessão indisponível' })
    ).toHaveClass('text-main');
  });

  it('clicar chama onRetry exatamente 1 vez', () => {
    const onRetry = jest.fn();
    render(<SessionUnavailable onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it.each([['{Enter}'], [' ']])(
    'o teclado (%j) no foco aciona onRetry 1 vez',
    async tecla => {
      const user = userEvent.setup();
      const onRetry = jest.fn();
      render(<SessionUnavailable onRetry={onRetry} />);
      const botao = screen.getByRole('button', { name: 'Tentar novamente' });
      botao.focus();
      await user.keyboard(tecla);
      expect(onRetry).toHaveBeenCalledTimes(1);
    }
  );

  it('sem onRetry o botão não lança', () => {
    render(<SessionUnavailable />);
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    ).not.toThrow();
  });

  it('é exportado pelo barrel de components/app', () => {
    expect(DoBarrel).toBe(SessionUnavailable);
  });
});
