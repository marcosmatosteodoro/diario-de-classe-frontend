import { AuthenticatedApi } from './authenticatedApi';

export class AbstractEntityApi extends AuthenticatedApi {
  constructor() {
    super();
    this.baseEndpoint = this.getEndpoint();
  }

  getEndpoint() {
    throw new Error('getEndpoint() must be implemented in subclass');
  }

  async getAll() {
    return this.api.get(`${this.baseEndpoint}`);
  }

  async getById(id) {
    return this.api.get(`${this.baseEndpoint}/${id}`);
  }

  async create(data) {
    return this.api.post(`${this.baseEndpoint}`, data);
  }

  async update(id, data) {
    return this.api.put(`${this.baseEndpoint}/${id}`, data);
  }

  async delete(id) {
    return this.api.delete(`${this.baseEndpoint}/${id}`);
  }
}
