import { render, act } from '@testing-library/react';
import React from 'react';
import { useEditarAula } from './useEditarAndamentoAula';
import * as reactRedux from 'react-redux';
import * as nextRouter from 'next/navigation';
import * as ToastProvider from '@/providers/ToastProvider';
import { STATUS } from '@/constants';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/providers/ToastProvider', () => ({
  useToast: jest.fn(),
}));

const mockDispatch = jest.fn();
const mockSuccess = jest.fn();
const mockRouter = { push: jest.fn() };

function HookTestComponent({ aulaId, callback }) {
  const hook = useEditarAula(aulaId);
  React.useEffect(() => {
    if (callback) callback(hook);
    // eslint-disable-next-line
  }, [hook]);
  return null;
}

describe('useEditarAula', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reactRedux.useDispatch.mockReturnValue(mockDispatch);
    nextRouter.useRouter.mockReturnValue(mockRouter);
    ToastProvider.useToast.mockReturnValue({ success: mockSuccess });
  });

  it('should dispatch updateAndamentoAula on submit', () => {
    reactRedux.useSelector.mockReturnValue({
      status: '',
      message: '',
      errors: null,
      current: null,
      action: '',
      statusError: null,
    });
    let hookResult;
    render(
      <HookTestComponent
        aulaId={1}
        callback={hook => {
          hookResult = hook;
        }}
      />
    );
    const data = { andamento: 'novo' };
    act(() => {
      hookResult.submit({ id: 1, dataToSend: data });
    });
    // Espera que o dispatch seja chamado com uma função (thunk)
    expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should dispatch clearStatus on mount', () => {
    const clearStatusAction = { type: expect.stringContaining('clearStatus') };
    reactRedux.useSelector.mockReturnValue({
      status: '',
      message: '',
      errors: null,
      current: null,
      action: '',
      statusError: null,
    });
    render(<HookTestComponent aulaId={1} />);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining(clearStatusAction)
    );
  });

  it('should handle success effect', () => {
    reactRedux.useSelector.mockReturnValue({
      status: STATUS.SUCCESS,
      message: '',
      errors: null,
      current: {},
      action: 'updateAndamentoAula',
      statusError: null,
    });
    render(<HookTestComponent aulaId={1} />);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: expect.stringContaining('clearCurrent') })
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: expect.stringContaining('clearStatus') })
    );
    expect(mockSuccess).toHaveBeenCalledWith('Operação realizada com sucesso!');
  });
});
