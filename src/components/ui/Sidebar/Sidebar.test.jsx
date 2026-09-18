import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './index';

// Mock providers and hooks used by Sidebar
jest.mock('@/providers/UserAuthProvider', () => ({
  useUserAuth: () => ({ isAdmin: () => true }),
}));

// Mock do useSidebar para controlar o retorno dos itens e funções
jest.mock('./useSidebar', () => ({
  useSidebar: () => ({
    strokeWidth: 1,
    sidebarItems: [
      {
        href: '/home',
        label: 'Home',
        icon: <span data-testid="icon-home">icon</span>,
        show: true,
      },
      {
        href: '/alunos',
        label: 'Alunos',
        icon: <span data-testid="icon-alunos">icon</span>,
        show: true,
      },
    ],
    isActive: href => href === '/home',
  }),
}));

describe('Sidebar', () => {
  it('renderiza os itens corretamente', () => {
    render(<Sidebar isExpanded={true} toggleSidebar={() => {}} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Alunos')).toBeInTheDocument();
    expect(screen.getByTestId('icon-home')).toBeInTheDocument();
    expect(screen.getByTestId('icon-alunos')).toBeInTheDocument();
  });

  it('marca o item ativo corretamente', () => {
    render(<Sidebar isExpanded={true} toggleSidebar={() => {}} />);
    const homeItem = screen.getByText('Home').closest('a');
    // O item ativo deve ter o texto azul
    expect(homeItem.querySelector('span')).toHaveClass('primary-color');
  });

  it('chama toggleSidebar ao clicar no botão', () => {
    const mockToggle = jest.fn();
    render(<Sidebar isExpanded={true} toggleSidebar={mockToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockToggle).toHaveBeenCalled();
  });

  it('ganha o id que o aria-controls do Header referencia', () => {
    render(<Sidebar isExpanded={true} toggleSidebar={() => {}} />);
    expect(screen.getByTestId('sidebar')).toHaveAttribute(
      'id',
      'main-navigation'
    );
  });

  it('com isExpanded=false, compõe -translate-x-full e md:translate-x-0, sem translate-x-0 não-prefixado', () => {
    render(<Sidebar isExpanded={false} toggleSidebar={() => {}} />);
    const classes = screen.getByTestId('sidebar').className.split(' ');
    expect(classes).toContain('-translate-x-full');
    expect(classes).toContain('md:translate-x-0');
    expect(classes).not.toContain('translate-x-0');
  });

  it('com isExpanded=true, translate-x-0 (não-prefixado) e md:translate-x-0 convivem', () => {
    render(<Sidebar isExpanded={true} toggleSidebar={() => {}} />);
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.className).toContain('translate-x-0');
    expect(sidebar.className).toContain('md:translate-x-0');
  });
});
