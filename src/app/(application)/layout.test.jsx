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
  InstallPrompt: () => <div data-testid="install-prompt-mock" />,
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
    // O convite de instalação monta dentro da árvore autenticada — nunca em
    // `(auth)/layout.jsx` (AC-001-018).
    expect(screen.getByTestId('install-prompt-mock')).toBeInTheDocument();
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
    expect(screen.queryByTestId('install-prompt-mock')).not.toBeInTheDocument();
  });

  it('não monta o convite de instalação enquanto isUnauthorized é true', () => {
    jest.resetModules();
    jest.doMock('./useApplicationLayout', () => ({
      useApplicationLayout: () => ({
        isLoading: false,
        isUnauthorized: true,
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
    expect(screen.queryByTestId('install-prompt-mock')).not.toBeInTheDocument();
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

  it('main tem min-w-0, para não crescer pelo conteúdo mínimo de um filho flex quando o conteúdo é mais largo que a viewport', () => {
    render(
      <ApplicationLayout>
        {' '}
        <div data-testid="conteudo" />{' '}
      </ApplicationLayout>
    );
    const classes = screen.getByRole('main').className.split(' ');
    expect(classes).toContain('min-w-0');
    expect(classes).toContain('flex-1');
  });
});
