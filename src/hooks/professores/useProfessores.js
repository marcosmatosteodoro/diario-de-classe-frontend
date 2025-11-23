import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { STATUS } from '@/constants';
import { getProfessores } from '@/store/slices/professoresSlice';

export function useProfessores() {
  const dispatch = useDispatch();
  const { list, status } = useSelector(state => state.professores);

  useEffect(() => {
    dispatch(getProfessores());
  }, [dispatch]);

  const isLoading = status === STATUS.IDLE || status === STATUS.LOADING;
  const isSuccess = status === STATUS.SUCCESS;
  const isEmpty = isSuccess && list && list.length === 0;

  return {
    professores: list,
    status,
    isLoading,
    isSuccess,
    isEmpty,
  };
}
