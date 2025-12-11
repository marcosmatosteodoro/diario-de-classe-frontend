import { ContratoApi } from '@/store/api/contratoApi';

export class GetContratoByIdService {
  constructor(contratoApi) {
    this.contratoApi = contratoApi;
  }

  async execute(id) {
    return await this.contratoApi.getById(id);
  }

  static async handle(id) {
    const contratoApi = new ContratoApi();
    const service = new GetContratoByIdService(contratoApi);

    return await service.execute(id);
  }
}
