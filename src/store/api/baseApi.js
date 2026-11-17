'use client';

import axios from 'axios';
import { API_BASE_PATH } from '@/constants/api';

export class BaseApi {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_PATH,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async get(endpoint, params = {}) {
    return await this.api.get(endpoint, { params });
  }

  async post(endpoint, data) {
    return await this.api.post(endpoint, data);
  }

  async put(endpoint, data) {
    return await this.api.put(endpoint, data);
  }

  async destroy(endpoint) {
    return await this.api.delete(endpoint);
  }
}
