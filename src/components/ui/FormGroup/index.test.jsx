import { render } from '@testing-library/react';
import { FormGroup } from './index.jsx';

describe('FormGroup', () => {
  it('renders children inside a grid container', () => {
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
});
