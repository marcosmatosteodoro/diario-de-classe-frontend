import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { STATUS } from '@/constants';
import {
  clearStatus,
  clearCurrent,
  createGroupDiaAula,
} from '@/store/slices/diasAulasSlice';

export function useStep2Form({
  successSubmit,
  errorSubmit,
  clearError,
  setFormData,
}) {
  const dispatch = useDispatch();
  const { status, message, errors, list, action } = useSelector(
    state => state.diasAulas
  );

  const submitStep2 = formData => {
    const dataToSend = formData.diasAulas
      .filter(diaAula => diaAula.ativo)
      .map(diaAula => ({
        idAluno: formData.alunoId,
        idContrato: formData.contratoId,
        diaSemana: diaAula.diaSemana,
        quantidadeAulas: diaAula.quantidadeAulas,
        horaInicial: diaAula.horaInicial,
      }));
    clearError();
    console.log(dataToSend);
    dispatch(createGroupDiaAula(dataToSend));
  };

  useEffect(() => {
    dispatch(clearStatus());
    dispatch(clearCurrent());
  }, [dispatch]);

  useEffect(() => {
    if (action === 'createDiaAula') {
      if (status === STATUS.SUCCESS && list) {
        setFormData(prev => ({
          ...prev,
          currentDiasAulas: list,
        }));
        successSubmit();
      } else if (status === STATUS.FAILED) {
        errorSubmit({ message, errors });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, list, action, message, errors]);

  return {
    submitStep2,
  };
}
