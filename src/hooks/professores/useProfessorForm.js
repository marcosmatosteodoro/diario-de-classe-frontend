import { useState } from 'react';
import { IDIOMA, PERMISSAO } from '@/constants';

export function useProfessorForm({ id = null, isEdit = false, submit }) {
  const [isSenhaError, setIsSenhaError] = useState(false);
  const [alterarSenhaAtivo, setAlterarSenhaAtivo] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    sobrenome: '',
    email: '',
    telefone: '',
    senha: '',
    repetirSenha: '',
    idioma: IDIOMA.INGLES,
    idiomas: [IDIOMA.INGLES],
    permissao: PERMISSAO.MEMBER,
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAlterarSenha = () => {
    setAlterarSenhaAtivo(true);
  };

  const handleCancelarAlteracaoSenha = () => {
    setAlterarSenhaAtivo(false);
    setFormData(prev => ({ ...prev, senha: '', repetirSenha: '' }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    // em criação, senha sempre é enviada (FR-001-008); em edição, só quando
    // "Alterar senha" foi acionado (DEC-002-003) — sem acionar, a checagem de
    // coincidência e a presença de `senha` no payload não se aplicam.
    const alterandoSenha = !isEdit || alterarSenhaAtivo;

    // impedindo continuar caso as senhas não batam
    if (alterandoSenha && formData.senha !== formData.repetirSenha) {
      setIsSenhaError(true);
      return;
    }
    setIsSenhaError(false);
    const { senha, repetirSenha, ...dataToSend } = formData;
    if (alterandoSenha) {
      dataToSend.senha = senha;
    }
    dataToSend.idiomas = [dataToSend.idioma];
    delete dataToSend.idioma;
    submit({ id, dataToSend });
  };

  return {
    isSenhaError,
    alterarSenhaAtivo,
    formData,
    handleSubmit,
    handleChange,
    handleAlterarSenha,
    handleCancelarAlteracaoSenha,
    setFormData,
  };
}
