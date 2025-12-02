import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getProfessor,
  getAulasProfessor,
  getAlunosProfessor,
} from '@/store/slices/professoresSlice';
import { STATUS } from '@/constants';

export function useProfessor(id) {
  const dispatch = useDispatch();
  const { current, aulas, alunos, message, status, statusError } = useSelector(
    state => state.professores
  );
  const isLoading = status === STATUS.IDLE || status === STATUS.LOADING;
  const isSuccess = status === STATUS.SUCCESS;
  const isFailed = status === STATUS.FAILED;

  useEffect(() => {
    if (id) {
      dispatch(getProfessor(id));
      dispatch(getAulasProfessor(id));
      dispatch(getAlunosProfessor(id));
    }
  }, [dispatch, id]);

  return {
    professor: current,
    aulas,
    alunos,
    message,
    isLoading,
    isSuccess,
    isFailed,
    statusError,
  };
}
