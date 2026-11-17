import { render, screen } from '@testing-library/react';
import { NonceProvider, useNonce } from './NonceProvider';

const Leitor = () => <span data-testid="nonce">{String(useNonce())}</span>;

describe('NonceProvider', () => {
  it('entrega o nonce aos descendentes', () => {
    render(
      <NonceProvider nonce="abc">
        <Leitor />
      </NonceProvider>
    );
    expect(screen.getByTestId('nonce')).toHaveTextContent('abc');
  });

  it('sem provider devolve undefined, sem lançar', () => {
    render(<Leitor />);
    expect(screen.getByTestId('nonce')).toHaveTextContent('undefined');
  });
});
