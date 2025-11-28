import { render } from '@testing-library/react';
import { FormGroup } from './index.jsx';

describe('FormGroup', () => {
  it('renders children inside a grid container with default classes', () => {
    const { container } = render(
      <FormGroup>
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
      </FormGroup>
    );
    const gridDiv = container.firstChild;
    expect(gridDiv).toHaveClass('grid');
    expect(gridDiv).toHaveClass('grid-cols-1');
    expect(gridDiv).toHaveClass('md:grid-cols-2');
    expect(gridDiv).toHaveClass('gap-6');
    expect(
      container.querySelector('[data-testid="child1"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="child2"]')
    ).toBeInTheDocument();
  });

  it('applies custom className if provided', () => {
    const { container } = render(
      <FormGroup className="custom-class">
        <div>Conteúdo</div>
      </FormGroup>
    );
    const gridDiv = container.firstChild;
    expect(gridDiv).toHaveClass('custom-class');
  });

  it('uses cols=1 to omit md:grid-cols-2', () => {
    const { container } = render(
      <FormGroup cols={1}>
        <div>Teste</div>
      </FormGroup>
    );
    const gridDiv = container.firstChild;
    expect(gridDiv).not.toHaveClass('md:grid-cols-2');
    expect(gridDiv).toHaveClass('grid-cols-1');
  });

  it('uses custom cols and className together', () => {
    const { container } = render(
      <FormGroup cols={1} className="extra-class">
        <div>Teste</div>
      </FormGroup>
    );
    const gridDiv = container.firstChild;
    expect(gridDiv).toHaveClass('extra-class');
    expect(gridDiv).toHaveClass('grid-cols-1');
    expect(gridDiv).not.toHaveClass('md:grid-cols-2');
  });
});
