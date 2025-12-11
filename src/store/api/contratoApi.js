import { AbstractEntityApi } from './abstractEntityApi';

export class ContratoApi extends AbstractEntityApi {
  constructor() {
    super();
  }

  getEndpoint() {
    return '/contratos';
  }
}
