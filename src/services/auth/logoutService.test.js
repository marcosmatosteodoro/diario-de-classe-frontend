const mockLogout = jest.fn().mockResolvedValue('logout-result');
jest.mock('@/store/api/authApi', () => ({
  AuthApi: jest.fn().mockImplementation(() => ({ logout: mockLogout })),
}));

import { LogoutService } from './logoutService';

describe('LogoutService', () => {
  beforeEach(() => mockLogout.mockClear());

  it('execute chama authApi.logout sem argumento', async () => {
    const mockApi = { logout: jest.fn().mockResolvedValue('result') };
    const service = new LogoutService(mockApi);
    const result = await service.execute();
    expect(mockApi.logout).toHaveBeenCalledTimes(1);
    expect(mockApi.logout.mock.calls[0]).toHaveLength(0);
    expect(result).toBe('result');
  });

  it('static handle não recebe parâmetro e chama authApi.logout sem argumento', async () => {
    expect(LogoutService.handle).toHaveLength(0);
    const result = await LogoutService.handle();
    expect(mockLogout.mock.calls[0]).toHaveLength(0);
    expect(result).toBe('logout-result');
  });
});
