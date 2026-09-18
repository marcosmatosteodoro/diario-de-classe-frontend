import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApplicationLayout from './layout';

// Mocks
jest.mock('./useApplicationLayout', () => ({
  useApplicationLayout: () => ({
    isLoading: false,
    sidebarExpanded: {
      isExpanded: true,
    },
    toggleSidebar: jest.fn(),
  }),
}));

jest.mock('@/components', () => ({
  Header: ({ isExpanded, toggleSidebar }) => (
    <header
      data-testid="header"
      data-expanded={isExpanded}
      onClick={toggleSidebar}
    />
  ),
  Sidebar: ({ isExpanded, toggleSidebar }) => (
    <aside
      data-testid="sidebar"
      data-expanded={isExpanded}
      onClick={toggleSidebar}
    />
  ),
  Footer: () => <footer data-testid="footer" />,
  Loading: () => <div data-testid="loading" />,
}));

describe('ApplicationLayout', () => {
  it('renderiza todos os componentes principais', () => {
    render(
      <ApplicationLayout>
        {' '}
        <div data-testid="conteudo" />{' '}
      </ApplicationLayout>
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByTestId('conteudo')).toBeInTheDocument();
  });

  it('mostra o loading quando isLoading é true', () => {
    jest.resetModules();
    jest.doMock('./useApplicationLayout', () => ({
      useApplicationLayout: () => ({
        isLoading: true,
        sidebarExpanded: {
          isExpanded: true,
        },
        toggleSidebar: jest.fn(),
      }),
    }));
    const { default: ApplicationLayoutReloaded } = require('./layout');
    render(
      <ApplicationLayoutReloaded>
        {' '}
        <div data-testid="conteudo" />{' '}
      </ApplicationLayoutReloaded>
    );
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('passa isExpanded/toggleSidebar corretos para Sidebar e Header, e permite toggle', async () => {
    const toggleSidebar = jest.fn();
    jest.resetModules();
    jest.doMock('./useApplicationLayout', () => ({
      useApplicationLayout: () => ({
        isLoading: false,
        sidebarExpanded: {
          isExpanded: false,
        },
        toggleSidebar,
      }),
    }));
    const { default: ApplicationLayoutReloaded } = require('./layout');
    render(
      <ApplicationLayoutReloaded>
        {' '}
        <div data-testid="conteudo" />{' '}
      </ApplicationLayoutReloaded>
    );
    const sidebar = screen.getByTestId('sidebar');
    const header = screen.getByTestId('header');
    expect(sidebar).toHaveAttribute('data-expanded', 'false');
    expect(header).toHaveAttribute('data-expanded', 'false');
    fireEvent.click(sidebar);
    await waitFor(() => expect(toggleSidebar).toHaveBeenCalled());
  });
});
