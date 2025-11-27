import { render, fireEvent } from '@testing-library/react';
import { Form } from './index';

describe('Form', () => {
  it('renders children and calls handleSubmit on submit', () => {
    const handleSubmit = jest.fn(e => e.preventDefault());
    const { getByText, getByTestId } = render(
      <Form handleSubmit={handleSubmit} props={{ 'data-testid': 'form-test' }}>
        <button type="submit">Enviar</button>
      </Form>
    );
    expect(getByText('Enviar')).toBeInTheDocument();
    fireEvent.submit(getByTestId('form-test'));
    expect(handleSubmit).toHaveBeenCalled();
  });

  it('passes extra props to the form element', () => {
    const { getByTestId } = render(
      <Form
        handleSubmit={() => {}}
        props={{ 'data-testid': 'my-form', id: 'form-id' }}
      >
        <div>Conteúdo</div>
      </Form>
    );
    const form = getByTestId('my-form');
    expect(form).toHaveAttribute('data-testid', 'my-form');
    expect(form).toHaveAttribute('id', 'form-id');
  });
});
