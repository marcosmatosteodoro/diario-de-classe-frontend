import { useDispatch } from 'react-redux';
import { deleteProfessor } from '@/store/slices/professoresSlice';
import useSweetAlert from '@/hooks/useSweetAlert';

export function useDeletarProfessor() {
  const dispatch = useDispatch();
  const { showSuccess, showError, showConfirm } = useSweetAlert();

  const handleDeleteProfessor = async id => {
    const resultAlert = await showConfirm({
      title: 'Confirmar exclusão?',
      text: 'O registro desse professor não pode ser recuperado!',
    });
    if (resultAlert.isConfirmed) {
      const result = await dispatch(deleteProfessor(id));
      if (result.error) {
        showError({
          title: 'Erro!',
          text: 'Não foi possível excluir o professor.',
        });
      } else {
        showSuccess({
          title: 'Confirmado!',
          text: 'Professor excluído com sucesso.',
        });
      }
    }
  };

  return {
    handleDeleteProfessor,
  };
}
