import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { STATUS, FILTER_STORAGE_KEYS } from '@/constants';
import { getAulas } from '@/store/slices/aulasSlice';
import { loadFilters, saveFilters, clearFilters } from '@/utils/filterStorage';

// Calcula os defaults de data client-side. Chamado tanto pelo efeito de
// montagem (que só grava se o campo ainda for `null`) quanto por
// `handleClearFilter` (evento do usuário, sempre pós-montagem, sem risco de
// divergência SSR/CSR).
const getDatasPadrao = () => {
  const hoje = new Date();
  const dataInicioFormatada = hoje.toISOString().split('T')[0];
  const dataFim = new Date(hoje);
  dataFim.setMonth(dataFim.getMonth() + 3);
  const dataTerminoFormatada = dataFim.toISOString().split('T')[0];
  return { dataInicioFormatada, dataTerminoFormatada };
};

export function useAulas() {
  const dispatch = useDispatch();
  const { list, status, action } = useSelector(state => state.aulas);

  const defaultFormData = {
    dataInicio: null,
    dataTermino: null,
    tipo: '',
    status: '',
    idAluno: '',
    idProfessor: '',
    q: '',
  };

  const [formData, setFormData] = useState(() =>
    loadFilters(FILTER_STORAGE_KEYS.aulas, defaultFormData)
  );

  useEffect(() => {
    const { dataInicioFormatada, dataTerminoFormatada } = getDatasPadrao();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(prev => ({
      ...prev,
      dataInicio:
        prev.dataInicio === null ? dataInicioFormatada : prev.dataInicio,
      dataTermino:
        prev.dataTermino === null ? dataTerminoFormatada : prev.dataTermino,
    }));
  }, []);

  const searchParams = query =>
    setFormData(prevState => ({
      ...prevState,
      q: query,
    }));

  const handleSubmit = useCallback(
    formData => {
      dispatch(getAulas(formData));
    },
    [dispatch]
  );

  const handleChange = async e => {
    const { name, value, checked, type } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleClearFilter = () => {
    const { dataInicioFormatada, dataTerminoFormatada } = getDatasPadrao();
    clearFilters(FILTER_STORAGE_KEYS.aulas);
    setFormData({
      ...defaultFormData,
      dataInicio: dataInicioFormatada,
      dataTermino: dataTerminoFormatada,
    });
  };

  useEffect(() => {
    saveFilters(FILTER_STORAGE_KEYS.aulas, formData);
    handleSubmit(formData);
  }, [handleSubmit, formData]);

  const isLoading =
    action === 'getAulas' &&
    (status === STATUS.IDLE || status === STATUS.LOADING);

  return {
    aulas: list,
    status,
    isLoading,
    searchParams,
    handleSubmit,
    handleChange,
    handleClearFilter,
    formData,
  };
}
