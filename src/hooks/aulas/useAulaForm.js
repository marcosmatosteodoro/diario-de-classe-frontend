import { DURACAO_AULA } from '@/constants';
import { calculateHoraFimByDuracaoAula } from '@/utils/calculateHoraFim';
import { useState, useEffect } from 'react';

export function useAulaForm({ id = null, submit }) {
  const [formData, setFormData] = useState({
    idAluno: '',
    idProfessor: '',
    idContrato: '',
    dataAula: null,
    duracaoAula: DURACAO_AULA[40],
    horaInicial: '',
    horaFinal: '',
    tipo: 'PADRAO',
    status: 'AGENDADA',
    observacao: '',
  });

  useEffect(() => {
    const dataInicioFormatada = new Date().toISOString().split('T')[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(prev =>
      prev.dataAula !== null ? prev : { ...prev, dataAula: dataInicioFormatada }
    );
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    let extraData = {};

    if (['horaInicial', 'duracaoAula'].includes(name)) {
      extraData.horaFinal = calculateHoraFimByDuracaoAula({
        horaInicial: name === 'horaInicial' ? value : formData.horaInicial,
        duracaoAula: name === 'duracaoAula' ? value : formData.duracaoAula,
      });
    }

    setFormData(prev => ({
      ...prev,
      ...extraData,
      [name]: value,
    }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    const dataToSend = {
      ...formData,
      duracaoAula: parseInt(formData.duracaoAula),
      dataAula: formData.dataAula
        ? new Date(formData.dataAula).toISOString()
        : '',
    };
    submit({ id, dataToSend });
  };

  return {
    formData,
    handleSubmit,
    handleChange,
    setFormData,
  };
}
