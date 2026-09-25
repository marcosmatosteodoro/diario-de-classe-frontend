import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormSection } from './index';

describe('FormSection component', () => {
  it('renders the title in a legend and the children inside the fieldset', () => {
    render(
      <FormSection title="Informações pessoais">
        <div>Conteúdo de teste</div>
      </FormSection>
    );

    expect(screen.getByText('Informações pessoais').tagName).toBe('LEGEND');
    expect(screen.getByText('Conteúdo de teste')).toBeInTheDocument();
  });

  it('applies the SectionTitle visual classes to the legend', () => {
    render(
      <FormSection title="Segurança">
        <div>child</div>
      </FormSection>
    );

    const legend = screen.getByText('Segurança');
    expect(legend).toHaveClass('text-lg');
    expect(legend).toHaveClass('text-main');
    expect(legend).toHaveClass('font-semibold');
    expect(legend).toHaveClass('mb-3');
  });

  it('resets border, padding and min-width on the native fieldset', () => {
    render(
      <FormSection title="Acesso" dataTestId="form-section">
        <div>child</div>
      </FormSection>
    );

    const fieldset = screen.getByTestId('form-section');
    expect(fieldset.tagName).toBe('FIELDSET');
    expect(fieldset).toHaveClass('border-0');
    expect(fieldset).toHaveClass('p-0');
    expect(fieldset).toHaveClass('m-0');
    expect(fieldset).toHaveClass('min-w-0');
  });

  it('uses form-section as the default dataTestId', () => {
    render(
      <FormSection title="Acesso">
        <div>child</div>
      </FormSection>
    );

    expect(screen.getByTestId('form-section')).toBeInTheDocument();
  });

  it('exposes an accessible group name derived from the legend', () => {
    render(
      <FormSection title="Material">
        <div>child</div>
      </FormSection>
    );

    expect(screen.getByRole('group', { name: 'Material' })).toBeInTheDocument();
  });
});
