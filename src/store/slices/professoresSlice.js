'use client';

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ProfessorApi } from '../api/professorApi';

const professorApi = new ProfessorApi();

// GET ALL
export const getProfessores = createAsyncThunk(
  'professores/getAll',
  async () => {
    const res = await professorApi.getAll();
    return res.data.data;
  }
);

// CREATE
export const createProfessor = createAsyncThunk(
  'professores/create',
  async data => {
    const res = await professorApi.create(data);
    return res.data;
  }
);

// UPDATE
export const updateProfessor = createAsyncThunk(
  'professores/update',
  async ({ id, data }) => {
    const res = await professorApi.update(id, data);
    return res.data;
  }
);

// DELETE
export const deleteProfessor = createAsyncThunk(
  'professores/delete',
  async id => {
    await professorApi.delete(id);
    return id;
  }
);

const professoresSlice = createSlice({
  name: 'professores',
  initialState: {
    list: [],
    loading: false,
  },
  extraReducers: builder => {
    builder
      .addCase(getProfessores.pending, state => {
        state.loading = true;
      })
      .addCase(getProfessores.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(createProfessor.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(updateProfessor.fulfilled, (state, action) => {
        const index = state.list.findIndex(p => p.id === action.payload.id);
        state.list[index] = action.payload;
      })
      .addCase(deleteProfessor.fulfilled, (state, action) => {
        state.list = state.list.filter(p => p.id !== action.payload);
      });
  },
});

export default professoresSlice.reducer;
