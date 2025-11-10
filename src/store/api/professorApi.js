import { AbstractEntityApi } from './abstractEntityApi';

export class ProfessorApi extends AbstractEntityApi {
  constructor() {
    super();
  }

  getEndpoint() {
    return '/professores';
  }
}
