import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { STATUS } from '@/constants';
import {
  clearCurrent,
  clearStatus,
  createProfessor,
} from '@/store/slices/professoresSlice';
import { useToast } from '@/providers/ToastProvider';
import { isAdmin } from '@/utils/isAdmin';

export function useNovoProfessor() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { success } = useToast();
  const { status, message, errors, current } = useSelector(
    state => state.professores
  );

  const [isSenhaError, setIsSenhaError] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    sobrenome: '',
    email: '',
    telefone: '',
    senha: '',
    repetirSenha: '',
    permissao: 'professor',
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

    // impedindo continuar caso as senhas não batam
    if (formData.senha !== formData.repetirSenha) {
      setIsSenhaError(true);
      return;
    }
    setIsSenhaError(false);
    const { repetirSenha, ...dataToSend } = formData;
    dispatch(createProfessor(dataToSend));
  };

  useEffect(() => {
    dispatch(clearStatus());
  }, [dispatch]);

  useEffect(() => {
    if (status === STATUS.SUCCESS && current) {
      dispatch(clearCurrent());
      dispatch(clearStatus());
      success('Professor criado com sucesso!');
      router.push('/professores');
    }
  }, [status, router, success, current, dispatch]);

  // Estados computados para facilitar o uso
  const isLoading = status === STATUS.LOADING;
  const isSubmitting = status === STATUS.LOADING;

  return {
    message,
    errors,
    isLoading,
    isSubmitting,
    isSenhaError,
    isAdmin,
    handleSubmit,
    handleChange,
    formData,
  };
}
