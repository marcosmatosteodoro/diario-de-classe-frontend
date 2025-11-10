'use client';

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ProfessorApi } from '../api/professorApi';
import { GetProfessorListService } from '@/services/professor/getProfessorListService';
import { GetProfessorByIdService } from '@/services/professor/getProfessorByIdService';
import { CreateProfessorService } from '@/services/professor/createProfessorService';
import { UpdateProfessorService } from '@/services/professor/updateProfessorService';
import { DeleteProfessorService } from '@/services/professor/deleteProfessorService';

const professorApi = new ProfessorApi();

// GET ALL
export const getProfessores = createAsyncThunk(
  'professores/getAll',
  async (searchParam = null, { rejectWithValue }) => {
    try {
      const res = await GetProfessorListService.handle(searchParam);
      return res.data;
    } catch (error) {
      // Capturar a mensagem de erro da resposta da API
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro desconhecido';
      return rejectWithValue({ message: errorMessage });
    }
  }
);

// GET ONE
export const getProfessor = createAsyncThunk(
  'professores/getOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await GetProfessorByIdService.handle(id);
      return res.data;
    } catch (error) {
      // Capturar a mensagem de erro da resposta da API
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro desconhecido';
      return rejectWithValue({ message: errorMessage });
    }
  }
);

// CREATE
export const createProfessor = createAsyncThunk(
  'professores/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await CreateProfessorService.handle(data);
      return res.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Erro ao criar professor';

      const validationErrors = error.response?.data?.errors || [];

      return rejectWithValue({
        message: errorMessage,
        errors: validationErrors,
      });
    }
  }
);

// UPDATE
export const updateProfessor = createAsyncThunk(
  'professores/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await UpdateProfessorService.handle(id, data);
      return res.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Erro ao atualizar professor';

      const validationErrors = error.response?.data?.errors || [];

      return rejectWithValue({
        message: errorMessage,
        errors: validationErrors,
      });
    }
  }
);

// DELETE
export const deleteProfessor = createAsyncThunk(
  'professores/delete',
  async (id, { rejectWithValue }) => {
    try {
      await DeleteProfessorService.handle(id);
      return id;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Erro ao deletar professor';
      return rejectWithValue({ message: errorMessage });
    }
  }
);

const professoresSlice = createSlice({
  name: 'professores',
  initialState: {
    list: [],
    current: null,
    loading: false,
    errors: [],
    message: null,
    count: 0,
  },
  reducers: {
    clearErrors: state => {
      state.errors = [];
      state.message = null;
    },
  },
  extraReducers: builder => {
    builder
      // getProfessores
      .addCase(getProfessores.pending, state => {
        state.loading = true;
        state.errors = [];
        state.list = [];
        state.message = null;
      })
      .addCase(getProfessores.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.count = action.payload.count;
        state.message = action.payload.message;
      })
      .addCase(getProfessores.rejected, (state, action) => {
        state.loading = false;
        state.errors = action.error;
        state.message = action.payload.message;
      })
      // getProfessor
      .addCase(getProfessor.pending, state => {
        state.loading = true;
        state.errors = [];
        state.message = null;
        state.current = null;
      })
      .addCase(getProfessor.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(getProfessor.rejected, (state, action) => {
        state.loading = false;
        state.errors = action.error;
        state.message = action.payload.message;
      })
      // createProfessor
      .addCase(createProfessor.pending, state => {
        state.loading = true;
        state.errors = [];
        state.message = null;
      })
      .addCase(createProfessor.fulfilled, (state, action) => {
        state.loading = false;
        state.list.push(action.payload);
        state.message = 'Professor criado com sucesso';
      })
      .addCase(createProfessor.rejected, (state, action) => {
        state.loading = false;
        state.errors = action.payload?.errors || [];
        state.message = action.payload?.message || 'Erro ao criar professor';
      })
      // updateProfessor
      .addCase(updateProfessor.pending, state => {
        state.loading = true;
        state.errors = [];
        state.message = null;
      })
      .addCase(updateProfessor.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.list.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        state.current = action.payload;
        state.message = 'Professor atualizado com sucesso';
      })
      .addCase(updateProfessor.rejected, (state, action) => {
        state.loading = false;
        state.errors = action.error;
        state.message =
          action.payload?.message || 'Erro ao atualizar professor';
      })
      // deleteProfessor
      .addCase(deleteProfessor.pending, state => {
        state.loading = true;
        state.errors = [];
        state.message = null;
      })
      .addCase(deleteProfessor.fulfilled, (state, action) => {
        state.loading = false;
        state.list = state.list.filter(p => p.id !== action.payload);
        state.message = 'Professor deletado com sucesso';
      })
      .addCase(deleteProfessor.rejected, (state, action) => {
        state.loading = false;
        state.errors = action.error;
        state.message = action.payload?.message || 'Erro ao deletar professor';
      });
  },
});

export default professoresSlice.reducer;
