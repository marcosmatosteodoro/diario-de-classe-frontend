import { AbstractEntityApi } from './abstractEntityApi';

export class AulaApi extends AbstractEntityApi {
  constructor() {
    super();
  }

  getEndpoint() {
    return '/aulas';
  }
}
