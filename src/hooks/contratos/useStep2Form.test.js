import { renderHook, waitFor } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import { useStep2Form } from './useStep2Form';
import { STATUS } from '@/constants';
import {
  clearStatus,
  clearCurrent,
  createGroupDiaAula,
} from '@/store/slices/diasAulasSlice';

// Mock do react-redux
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

// Mock do slice
jest.mock('@/store/slices/diasAulasSlice', () => ({
  clearStatus: jest.fn(),
  clearCurrent: jest.fn(),
  createGroupDiaAula: jest.fn(),
}));

describe('useStep2Form', () => {
  let mockDispatch;
  let mockSuccessSubmit;
  let mockErrorSubmit;
  let mockClearError;
  let mockSetFormData;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDispatch = jest.fn();
    mockSuccessSubmit = jest.fn();
    mockErrorSubmit = jest.fn();
    mockClearError = jest.fn();
    mockSetFormData = jest.fn();

    useDispatch.mockReturnValue(mockDispatch);

    // Estado inicial padrão
    useSelector.mockReturnValue({
      status: STATUS.IDLE,
      message: null,
      errors: [],
      list: [],
      action: null,
    });
  });

  describe('initialization', () => {
    it('should dispatch clearStatus on mount', () => {
      renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      expect(mockDispatch).toHaveBeenCalledWith(clearStatus());
    });

    it('should dispatch clearCurrent on mount', () => {
      renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      expect(mockDispatch).toHaveBeenCalledWith(clearCurrent());
    });

    it('should return submitStep2 function', () => {
      const { result } = renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      expect(result.current.submitStep2).toBeDefined();
      expect(typeof result.current.submitStep2).toBe('function');
    });
  });

  describe('submitStep2', () => {
    it('should filter active dias aulas and dispatch createGroupDiaAula', () => {
      const { result } = renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      const formData = {
        alunoId: 1,
        contratoId: 10,
        diasAulas: [
          {
            ativo: true,
            diaSemana: 1,
            quantidadeAulas: 2,
            horaInicial: '10:00',
          },
          {
            ativo: true,
            diaSemana: 3,
            quantidadeAulas: 1,
            horaInicial: '14:00',
          },
          {
            ativo: false,
            diaSemana: 5,
            quantidadeAulas: 2,
            horaInicial: '16:00',
          },
        ],
      };

      result.current.submitStep2(formData);

      expect(mockClearError).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(
        createGroupDiaAula([
          {
            idAluno: 1,
            idContrato: 10,
            diaSemana: 1,
            quantidadeAulas: 2,
            horaInicial: '10:00',
          },
          {
            idAluno: 1,
            idContrato: 10,
            diaSemana: 3,
            quantidadeAulas: 1,
            horaInicial: '14:00',
          },
        ])
      );
    });

    it('should handle form data with only one active dia aula', () => {
      const { result } = renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      const formData = {
        alunoId: 2,
        contratoId: 20,
        diasAulas: [
          {
            ativo: true,
            diaSemana: 2,
            quantidadeAulas: 3,
            horaInicial: '09:00',
          },
        ],
      };

      result.current.submitStep2(formData);

      expect(mockDispatch).toHaveBeenCalledWith(
        createGroupDiaAula([
          {
            idAluno: 2,
            idContrato: 20,
            diaSemana: 2,
            quantidadeAulas: 3,
            horaInicial: '09:00',
          },
        ])
      );
    });

    it('should send empty array when no active dias aulas', () => {
      const { result } = renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      const formData = {
        alunoId: 3,
        contratoId: 30,
        diasAulas: [
          {
            ativo: false,
            diaSemana: 1,
            quantidadeAulas: 2,
            horaInicial: '10:00',
          },
          {
            ativo: false,
            diaSemana: 3,
            quantidadeAulas: 1,
            horaInicial: '14:00',
          },
        ],
      };

      result.current.submitStep2(formData);

      expect(mockDispatch).toHaveBeenCalledWith(createGroupDiaAula([]));
    });

    it('should handle empty diasAulas array', () => {
      const { result } = renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      const formData = {
        alunoId: 4,
        contratoId: 40,
        diasAulas: [],
      };

      result.current.submitStep2(formData);

      expect(mockDispatch).toHaveBeenCalledWith(createGroupDiaAula([]));
    });

    it('should clear errors before submitting', () => {
      const { result } = renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      const formData = {
        alunoId: 5,
        contratoId: 50,
        diasAulas: [
          {
            ativo: true,
            diaSemana: 1,
            quantidadeAulas: 2,
            horaInicial: '10:00',
          },
        ],
      };

      result.current.submitStep2(formData);

      expect(mockClearError).toHaveBeenCalledTimes(1);
      expect(mockClearError).toHaveBeenCalledBefore(mockDispatch);
    });
  });

  describe('success handling', () => {
    it('should call successSubmit and update formData on success', async () => {
      const mockList = [
        { id: 1, diaSemana: 1, quantidadeAulas: 2 },
        { id: 2, diaSemana: 3, quantidadeAulas: 1 },
      ];

      useSelector.mockReturnValue({
        status: STATUS.SUCCESS,
        message: 'Dias de aula criados com sucesso',
        errors: [],
        list: mockList,
        action: 'createDiaAula',
      });

      renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalledWith(expect.any(Function));
      });

      await waitFor(() => {
        expect(mockSuccessSubmit).toHaveBeenCalled();
      });

      // Verificar que o callback de setFormData atualiza corretamente
      const setFormDataCallback = mockSetFormData.mock.calls[0][0];
      const prevData = { some: 'data' };
      const result = setFormDataCallback(prevData);

      expect(result).toEqual({
        some: 'data',
        currentDiasAulas: mockList,
      });
    });

    it('should not call success callbacks if action is different', async () => {
      useSelector.mockReturnValue({
        status: STATUS.SUCCESS,
        message: 'Success',
        errors: [],
        list: [{ id: 1 }],
        action: 'getDiaAula', // Ação diferente
      });

      renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      await waitFor(() => {
        expect(mockSuccessSubmit).not.toHaveBeenCalled();
      });

      expect(mockSetFormData).not.toHaveBeenCalled();
    });

    it('should handle success with empty list', async () => {
      useSelector.mockReturnValue({
        status: STATUS.SUCCESS,
        message: 'Success',
        errors: [],
        list: [],
        action: 'createDiaAula',
      });

      renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      await waitFor(() => {
        expect(mockSetFormData).toHaveBeenCalled();
      });

      expect(mockSuccessSubmit).toHaveBeenCalled();

      const setFormDataCallback = mockSetFormData.mock.calls[0][0];
      const result = setFormDataCallback({});

      expect(result.currentDiasAulas).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should call errorSubmit on failure', async () => {
      const mockErrors = [
        { field: 'diaSemana', message: 'Dia da semana inválido' },
      ];

      useSelector.mockReturnValue({
        status: STATUS.FAILED,
        message: 'Erro ao criar dias de aula',
        errors: mockErrors,
        list: [],
        action: 'createDiaAula',
      });

      renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      await waitFor(() => {
        expect(mockErrorSubmit).toHaveBeenCalledWith({
          message: 'Erro ao criar dias de aula',
          errors: mockErrors,
        });
      });

      expect(mockSuccessSubmit).not.toHaveBeenCalled();
    });

    it('should handle error without validation errors', async () => {
      useSelector.mockReturnValue({
        status: STATUS.FAILED,
        message: 'Erro de servidor',
        errors: [],
        list: [],
        action: 'createDiaAula',
      });

      renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      await waitFor(() => {
        expect(mockErrorSubmit).toHaveBeenCalledWith({
          message: 'Erro de servidor',
          errors: [],
        });
      });
    });

    it('should not call error callbacks if action is different', async () => {
      useSelector.mockReturnValue({
        status: STATUS.FAILED,
        message: 'Error',
        errors: [],
        list: [],
        action: 'deleteDiaAula', // Ação diferente
      });

      renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      await waitFor(() => {
        expect(mockErrorSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('status changes', () => {
    it('should not trigger callbacks when status is LOADING', async () => {
      useSelector.mockReturnValue({
        status: STATUS.LOADING,
        message: null,
        errors: [],
        list: [],
        action: 'createDiaAula',
      });

      renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      await waitFor(() => {
        expect(mockSuccessSubmit).not.toHaveBeenCalled();
      });

      expect(mockErrorSubmit).not.toHaveBeenCalled();
    });

    it('should not trigger callbacks when status is IDLE', async () => {
      useSelector.mockReturnValue({
        status: STATUS.IDLE,
        message: null,
        errors: [],
        list: [],
        action: 'createDiaAula',
      });

      renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      await waitFor(() => {
        expect(mockSuccessSubmit).not.toHaveBeenCalled();
      });

      expect(mockErrorSubmit).not.toHaveBeenCalled();
    });
  });

  describe('multiple submissions', () => {
    it('should handle multiple sequential submissions', () => {
      const { result } = renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      const formData1 = {
        alunoId: 1,
        contratoId: 10,
        diasAulas: [
          {
            ativo: true,
            diaSemana: 1,
            quantidadeAulas: 2,
            horaInicial: '10:00',
          },
        ],
      };

      const formData2 = {
        alunoId: 2,
        contratoId: 20,
        diasAulas: [
          {
            ativo: true,
            diaSemana: 3,
            quantidadeAulas: 1,
            horaInicial: '14:00',
          },
        ],
      };

      result.current.submitStep2(formData1);
      result.current.submitStep2(formData2);

      expect(mockClearError).toHaveBeenCalledTimes(2);
      expect(mockDispatch).toHaveBeenCalledTimes(4); // 2 initial + 2 submissions
    });
  });

  describe('edge cases', () => {
    it('should handle missing ativo property (treated as falsy)', () => {
      const { result } = renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      const formData = {
        alunoId: 1,
        contratoId: 10,
        diasAulas: [
          {
            diaSemana: 1,
            quantidadeAulas: 2,
            horaInicial: '10:00',
          },
        ],
      };

      result.current.submitStep2(formData);

      expect(mockDispatch).toHaveBeenCalledWith(createGroupDiaAula([]));
    });

    it('should preserve all required fields in mapped data', () => {
      const { result } = renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      const formData = {
        alunoId: 10,
        contratoId: 100,
        diasAulas: [
          {
            ativo: true,
            diaSemana: 5,
            quantidadeAulas: 4,
            horaInicial: '08:30',
            extraField: 'should be ignored',
          },
        ],
      };

      result.current.submitStep2(formData);

      expect(mockDispatch).toHaveBeenCalledWith(
        createGroupDiaAula([
          {
            idAluno: 10,
            idContrato: 100,
            diaSemana: 5,
            quantidadeAulas: 4,
            horaInicial: '08:30',
          },
        ])
      );
    });

    it('should handle null list in success response', async () => {
      useSelector.mockReturnValue({
        status: STATUS.SUCCESS,
        message: 'Success',
        errors: [],
        list: null,
        action: 'createDiaAula',
      });

      renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      // Não deve chamar callbacks se list for null
      await waitFor(() => {
        expect(mockSuccessSubmit).not.toHaveBeenCalled();
      });

      expect(mockSetFormData).not.toHaveBeenCalled();
    });

    it('should handle large number of dias aulas', () => {
      const { result } = renderHook(() =>
        useStep2Form({
          successSubmit: mockSuccessSubmit,
          errorSubmit: mockErrorSubmit,
          clearError: mockClearError,
          setFormData: mockSetFormData,
        })
      );

      const diasAulas = Array.from({ length: 50 }, (_, i) => ({
        ativo: true,
        diaSemana: (i % 7) + 1,
        quantidadeAulas: (i % 5) + 1,
        horaInicial: `${8 + (i % 10)}:00`,
      }));

      const formData = {
        alunoId: 1,
        contratoId: 10,
        diasAulas,
      };

      result.current.submitStep2(formData);

      const dispatchCall = mockDispatch.mock.calls.find(
        call => call[0]?.type === createGroupDiaAula().type
      );

      expect(dispatchCall).toBeDefined();
      expect(dispatchCall[0].payload).toHaveLength(50);
    });
  });
});
