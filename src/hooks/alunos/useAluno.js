import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAluno } from '@/store/slices/alunosSlice';
import { STATUS } from '@/constants';

export function useAluno(id) {
  const dispatch = useDispatch();
  const { current, message, status, statusError } = useSelector(
    state => state.alunos
  );
  const isLoading = status === STATUS.IDLE || status === STATUS.LOADING;
  const isSuccess = status === STATUS.SUCCESS;
  const isFailed = status === STATUS.FAILED;

  useEffect(() => {
    if (id) {
      dispatch(getAluno(id));
    }
  }, [dispatch, id]);

  return {
    aluno: current,
    message,
    isLoading,
    isSuccess,
    isFailed,
    statusError,
  };
}
