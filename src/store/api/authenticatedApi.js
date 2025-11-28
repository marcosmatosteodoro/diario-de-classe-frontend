import { BaseApi } from './baseApi';

export class AuthenticatedApi extends BaseApi {
  constructor() {
    super();
    this.addTokenInterceptor();
  }

  addTokenInterceptor() {
    this.token = localStorage.getItem('token');
    this.api.interceptors.request.use(config => {
      const token = this.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  isAuthenticated() {
    return Boolean(this.token);
  }
}
