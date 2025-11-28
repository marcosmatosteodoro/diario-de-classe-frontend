import { setToken, getToken, removeToken } from './token';

describe('token utils', () => {
  const mockToken = {
    accessToken: 'abc123',
    refreshToken: 'def456',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: { id: 1, name: 'João' },
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('setToken should store token in localStorage', () => {
    setToken(mockToken);
    const stored = localStorage.getItem('token');
    expect(stored).toBe(JSON.stringify(mockToken));
  });

  it('getToken should retrieve token from localStorage', () => {
    localStorage.setItem('token', JSON.stringify(mockToken));
    const token = getToken();
    expect(token).toEqual(mockToken);
  });

  it('getToken should return null if no token', () => {
    expect(getToken()).toBeNull();
  });

  it('removeToken should remove token from localStorage', () => {
    localStorage.setItem('token', JSON.stringify(mockToken));
    removeToken();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
