import reducer, { getContratos } from './contratosSlice';
import { STATUS } from '@/constants';

const estadoInicial = reducer(undefined, { type: '@@INIT' });

const pending = requestId => ({
  type: getContratos.pending.type,
  meta: { requestId },
});
const fulfilled = (requestId, data) => ({
  type: getContratos.fulfilled.type,
  meta: { requestId },
  payload: { data, count: data.length, message: 'ok' },
});
const rejected = requestId => ({
  type: getContratos.rejected.type,
  meta: { requestId },
  error: { message: 'x' },
  payload: { message: 'falhou', statusError: 500 },
});

describe('contratosSlice — getContratos com resposta obsoleta', () => {
  it('começa sem requisição de listagem pendente', () => {
    expect(estadoInicial.listRequestId).toBeNull();
  });

  it('resolve B (última) e depois A (obsoleta): list permanece a de B', () => {
    let state = reducer(estadoInicial, pending('A'));
    state = reducer(state, pending('B'));
    state = reducer(state, fulfilled('B', [{ id: 'filtrado' }]));
    state = reducer(
      state,
      fulfilled('A', [{ id: 'neutro-1' }, { id: 'neutro-2' }])
    );

    expect(state.list).toEqual([{ id: 'filtrado' }]);
    expect(state.count).toBe(1);
    expect(state.status).toBe(STATUS.SUCCESS);
  });

  it('rejected obsoleto não muda status nem list', () => {
    let state = reducer(estadoInicial, pending('A'));
    state = reducer(state, pending('B'));
    state = reducer(state, fulfilled('B', [{ id: 'filtrado' }]));
    state = reducer(state, rejected('A'));

    expect(state.status).toBe(STATUS.SUCCESS);
    expect(state.list).toEqual([{ id: 'filtrado' }]);
    expect(state.statusError).toBeNull();
  });

  it('rejected da requisição vigente marca FAILED', () => {
    let state = reducer(estadoInicial, pending('A'));
    state = reducer(state, rejected('A'));

    expect(state.status).toBe(STATUS.FAILED);
    expect(state.statusError).toBe(500);
  });
});
