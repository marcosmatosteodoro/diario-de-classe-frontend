import { BaseApi } from './baseApi';
import { getAccessToken } from './sessionManager';

export class AuthenticatedApi extends BaseApi {
  constructor() {
    super();
    this.addTokenInterceptor();
  }

  addTokenInterceptor() {
    this.api.interceptors.request.use(config => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  isAuthenticated() {
    return Boolean(getAccessToken());
  }
}
