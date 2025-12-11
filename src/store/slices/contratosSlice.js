'use client';

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { STATUS } from '@/constants';
import { GetContratoListService } from '@/services/contrato/getContratoListService';
import { GetContratoByIdService } from '@/services/contrato/getContratoByIdService';
import { CreateContratoService } from '@/services/contrato/createContratoService';
import { UpdateContratoService } from '@/services/contrato/updateContratoService';
import { DeleteContratoService } from '@/services/contrato/deleteContratoService';

// GET ALL
export const getContratos = createAsyncThunk(
  'contratos/getAll',
  async (searchParam = null, { rejectWithValue }) => {
    try {
      const res = await GetContratoListService.handle(searchParam);
      return res.data;
    } catch (error) {
      // Capturar a mensagem de erro da resposta da API
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro desconhecido';
      return rejectWithValue({
        message: errorMessage,
        statusError: error.response?.status,
      });
    }
  }
);

// GET ONE
export const getContrato = createAsyncThunk(
  'contratos/getOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await GetContratoByIdService.handle(id);
      return res.data;
    } catch (error) {
      // Capturar a mensagem de erro da resposta da API
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro desconhecido';
      return rejectWithValue({
        message: errorMessage,
        statusError: error.response?.status,
      });
    }
  }
);

// CREATE
export const createContrato = createAsyncThunk(
  'contratos/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await CreateContratoService.handle(data);
      return res.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Erro ao criar contrato';

      const validationErrors = error.response?.data?.errors || [];

      return rejectWithValue({
        message: errorMessage,
        errors: validationErrors,
        statusError: error.response?.status,
      });
    }
  }
);

// UPDATE
export const updateContrato = createAsyncThunk(
  'contratos/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await UpdateContratoService.handle(id, data);
      return res.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Erro ao atualizar contrato';

      const validationErrors = error.response?.data?.errors || [];

      return rejectWithValue({
        message: errorMessage,
        errors: validationErrors,
        statusError: error.response?.status,
      });
    }
  }
);

// DELETE
export const deleteContrato = createAsyncThunk(
  'contratos/delete',
  async (id, { rejectWithValue }) => {
    try {
      await DeleteContratoService.handle(id);
      return id;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Erro ao deletar contrato';
      return rejectWithValue({
        message: errorMessage,
        statusError: error.response?.status,
      });
    }
  }
);

const contratosSlice = createSlice({
  name: 'contratos',
  initialState: {
    list: [],
    current: null,
    status: STATUS.IDLE,
    statusError: null,
    action: null,
    errors: [],
    message: null,
    count: 0,
  },
  reducers: {
    clearErrors: state => {
      state.errors = [];
      state.message = null;
      state.statusError = null;
    },
    clearStatus: state => {
      state.status = STATUS.IDLE;
    },
    clearCurrent: state => {
      state.current = null;
    },
  },
  extraReducers: builder => {
    builder
      // getContratos
      .addCase(getContratos.pending, state => {
        state.status = STATUS.LOADING;
        state.errors = [];
        state.list = [];
        state.message = null;
        state.statusError = null;
        state.action = 'getContratos';
      })
      .addCase(getContratos.fulfilled, (state, action) => {
        state.status = STATUS.SUCCESS;
        state.list = action.payload.data;
        state.count = action.payload.count;
        state.message = action.payload.message;
      })
      .addCase(getContratos.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.errors = action.error;
        state.message = action.payload.message;
        state.statusError = action.payload.statusError;
      })
      // getContrato
      .addCase(getContrato.pending, state => {
        state.status = STATUS.LOADING;
        state.errors = [];
        state.message = null;
        state.current = null;
        state.statusError = null;
        state.action = 'getContrato';
      })
      .addCase(getContrato.fulfilled, (state, action) => {
        state.status = STATUS.SUCCESS;
        state.current = action.payload;
      })
      .addCase(getContrato.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.errors = action.error;
        state.message = action.payload.message;
        state.statusError = action.payload.statusError;
      })
      // createContrato
      .addCase(createContrato.pending, state => {
        state.status = STATUS.LOADING;
        state.errors = [];
        state.message = null;
        state.statusError = null;
        state.action = 'createContrato';
      })
      .addCase(createContrato.fulfilled, (state, action) => {
        state.status = STATUS.SUCCESS;
        state.current = action.payload;
        if (!Array.isArray(state.list)) state.list = [];
        state.list.push(action.payload);
        state.count = (state.count || 0) + 1;
      })
      .addCase(createContrato.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.errors = action.payload?.errors || [];
        state.message = action.payload?.message || 'Erro ao criar contrato';
        state.statusError = action.payload.statusError;
      })
      // updateContrato
      .addCase(updateContrato.pending, state => {
        state.status = STATUS.LOADING;
        state.errors = [];
        state.message = null;
        state.statusError = null;
        state.action = 'updateContrato';
      })
      .addCase(updateContrato.fulfilled, (state, action) => {
        state.status = STATUS.SUCCESS;
        state.current = action.payload;
        if (Array.isArray(state.list)) {
          state.list = state.list.map(item =>
            item && item.id === action.payload.id ? action.payload : item
          );
        }
      })
      .addCase(updateContrato.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.errors = action.payload?.errors || [];
        state.message = action.payload?.message || 'Erro ao atualizar contrato';
        state.statusError = action.payload.statusError;
      })
      // deleteContrato
      .addCase(deleteContrato.pending, state => {
        state.status = STATUS.LOADING;
        state.errors = [];
        state.message = null;
        state.statusError = null;
        state.action = 'deleteContrato';
      })
      .addCase(deleteContrato.fulfilled, (state, action) => {
        state.status = STATUS.SUCCESS;
        // Remove o contrato da lista e atualiza o contador
        const deletedId = action.payload;
        if (Array.isArray(state.list)) {
          state.list = state.list.filter(item => item && item.id !== deletedId);
        }
        if (typeof state.count === 'number' && state.count > 0) {
          state.count = state.count - 1;
        }
        if (state.current && state.current.id === deletedId) {
          state.current = null;
        }
      })
      .addCase(deleteContrato.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.errors = action.payload?.errors || [];
        state.message = action.payload?.message || 'Erro ao deletar contrato';
        state.statusError = action.payload.statusError;
      });
  },
});

export const clearErrors = contratosSlice.actions.clearErrors;
export const clearStatus = contratosSlice.actions.clearStatus;
export const clearCurrent = contratosSlice.actions.clearCurrent;
export default contratosSlice.reducer;
