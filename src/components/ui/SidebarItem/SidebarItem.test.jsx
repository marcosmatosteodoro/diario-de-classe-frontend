import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { SidebarItem } from './index';

// Mock básico do componente
const defaultProps = {
  children: <span data-testid="icon">Icon</span>,
  label: 'Item',
  active: false,
  href: '/',
  sidebarExpanded: true,
};

describe('SidebarItem', () => {
  it('should render label and icon', () => {
    const { getByText, getByTestId } = render(
      <SidebarItem {...defaultProps} />
    );
    expect(getByText('Item')).toBeInTheDocument();
    expect(getByTestId('icon')).toBeInTheDocument();
  });

  it('should have active class when active', () => {
    const { container } = render(
      <SidebarItem {...defaultProps} active={true} />
    );
    // O span do ícone deve ter a classe de texto azul
    expect(container.querySelector('span.primary-color')).toBeInTheDocument();
  });

  it('should not have active class when not active', () => {
    const { container } = render(
      <SidebarItem {...defaultProps} active={false} />
    );
    // O span do ícone não deve ter a classe de texto azul
    expect(
      container.querySelector('span.primary-color')
    ).not.toBeInTheDocument();
  });

  it('should render without icon', () => {
    const { getByText, queryByTestId } = render(
      <SidebarItem
        label="Item"
        active={false}
        href="/"
        sidebarExpanded={true}
      ></SidebarItem>
    );
    expect(getByText('Item')).toBeInTheDocument();
    expect(queryByTestId('icon')).toBeNull();
  });

  it('should render with custom label', () => {
    const { getByText } = render(
      <SidebarItem {...defaultProps} label="Custom" />
    );
    expect(getByText('Custom')).toBeInTheDocument();
  });

  it('mostra a tooltip de recolhido (group-hover) quando sidebarExpanded=false, sem depender de isMobile', () => {
    const { container } = render(
      <SidebarItem {...defaultProps} sidebarExpanded={false} />
    );
    expect(
      container.querySelector('span.group-hover\\:inline-block')
    ).toBeInTheDocument();
  });

  it('em largura abaixo do breakpoint, fecha o drawer (onNavigate) ao clicar no link', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    const onNavigate = jest.fn();
    const { getByRole } = render(
      <SidebarItem {...defaultProps} onNavigate={onNavigate} />
    );
    fireEvent.click(getByRole('link'));
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
    expect(onNavigate).toHaveBeenCalled();
  });

  it('em largura a partir do breakpoint, não fecha o drawer ao clicar no link', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    const onNavigate = jest.fn();
    const { getByRole } = render(
      <SidebarItem {...defaultProps} onNavigate={onNavigate} />
    );
    fireEvent.click(getByRole('link'));
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
