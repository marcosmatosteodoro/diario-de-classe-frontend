import { render, fireEvent } from '@testing-library/react';
import { Header } from './index';
import { useLogout } from '@/hooks/auth/useLogout';

jest.mock('@/hooks/auth/useLogout', () => ({ useLogout: jest.fn() }));

describe('Header', () => {
  let logoutUserMock;

  beforeEach(() => {
    logoutUserMock = jest.fn();
    useLogout.mockReturnValue({ logoutUser: logoutUserMock });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render logo, title and logout button', () => {
    const { getByAltText, getByText } = render(<Header />);
    expect(getByAltText('Logo da empresa BLS')).toBeInTheDocument();
    expect(getByText('Diário de Classe')).toBeInTheDocument();
    expect(getByText('Sair')).toBeInTheDocument();
  });

  it('should call logoutUser when clicking Sair', () => {
    const { getByText } = render(<Header />);
    fireEvent.click(getByText('Sair'));
    expect(logoutUserMock).toHaveBeenCalled();
  });
});
