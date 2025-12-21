import { useState } from 'react';

export function useAulaForm({ id = null, submit }) {
  const [formData, setFormData] = useState({
    idAluno: '',
    idProfessor: '',
    idContrato: '',
    dataAula: '',
    horaInicio: '',
    horaFim: '',
    tipo: 'PADRAO',
    observacao: '',
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    submit({ id, dataToSend: formData });
  };

  return {
    formData,
    handleSubmit,
    handleChange,
    setFormData,
  };
}
