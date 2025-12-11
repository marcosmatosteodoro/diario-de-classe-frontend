import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getContrato } from '@/store/slices/contratosSlice';
import { STATUS } from '@/constants';
import { STATUS_ERROR } from '@/constants/statusError';

export function useContrato(id) {
  const dispatch = useDispatch();
  const { current, message, status, statusError } = useSelector(
    state => state.contratos
  );
  const isLoading = status === STATUS.IDLE || status === STATUS.LOADING;
  const isSuccess = status === STATUS.SUCCESS;
  const isFailed = status === STATUS.FAILED;
  const isNotFound =
    [STATUS_ERROR.BAD_REQUEST, STATUS_ERROR.NOT_FOUND].includes(statusError) &&
    !current;

  useEffect(() => {
    if (id) {
      dispatch(getContrato(id));
    }
  }, [dispatch, id]);

  return {
    contrato: current,
    message,
    isLoading,
    isSuccess,
    isFailed,
    isNotFound,
  };
}
