import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AulaForm } from '.';
import { useAlunos } from '@/hooks/alunos/useAlunos';
import { useProfessores } from '@/hooks/professores/useProfessores';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { getContratos } from '@/store/slices/contratosSlice';

jest.mock('@/hooks/alunos/useAlunos', () => ({ useAlunos: jest.fn() }));
jest.mock('@/hooks/professores/useProfessores', () => ({
  useProfessores: jest.fn(),
}));
jest.mock('@/providers/UserAuthProvider', () => ({ useUserAuth: jest.fn() }));

// O servidor (simulado) só devolve Contratos que respeitam os filtros
// recebidos — com um filtro restritivo de outro Aluno, a lista de X vem vazia.
const CONTRATOS_DO_ALUNO_7 = [
  {
    id: 10,
    idAluno: 7,
    status: 'ATIVO',
    dataInicio: '2024-01-01',
    dataTermino: '2024-12-31',
  },
];
jest.mock('@/store/slices/contratosSlice', () => ({
  getContratos: jest.fn(),
}));

const criarStore = () =>
  configureStore({
    reducer: (state = { contratos: { list: [], status: 'idle' } }, action) =>
      action.type === 'contratos/carregado'
        ? {
            contratos: {
              list: action.payload,
              status: 'success',
              action: 'getContratos',
            },
          }
        : state,
  });

describe('AulaForm — filtro salvo de /contratos não restringe a lista (BI-131)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'filters_contratos',
      JSON.stringify({ idAluno: 99, idioma: 'INGLES' })
    );
    getContratos.mockImplementation(filtros => dispatch => {
      const restritivo = filtros.idAluno !== '' && filtros.idAluno !== 7;
      dispatch({
        type: 'contratos/carregado',
        payload: restritivo ? [] : CONTRATOS_DO_ALUNO_7,
      });
    });
    useAlunos.mockReturnValue({
      alunos: [
        { id: 7, nome: 'Aluno', sobrenome: 'X', email: 'x@example.com' },
      ],
    });
    useProfessores.mockReturnValue({ professores: [] });
    useUserAuth.mockReturnValue({
      isAdmin: () => true,
      currentUser: {
        id: 1,
        nome: 'Adm',
        sobrenome: 'In',
        email: 'a@example.com',
      },
    });
  });

  it('com filtro restritivo salvo, o Aluno X exibe seus Contratos elegíveis', () => {
    render(
      <Provider store={criarStore()}>
        <AulaForm
          handleSubmit={jest.fn()}
          message=""
          errors={null}
          handleChange={jest.fn()}
          formData={{ idAluno: 7, idContrato: 10, idProfessor: 1 }}
          isLoading={false}
        />
      </Provider>
    );

    expect(getContratos).toHaveBeenCalledWith(
      expect.objectContaining({ idAluno: '' })
    );
    expect(
      screen.queryByText('Nenhum contrato disponível para este aluno.')
    ).not.toBeInTheDocument();
    expect(screen.getByDisplayValue(/ATIVO - de/)).toBeInTheDocument();
  });
});
