'use client';

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import professoresReducer from './slices/professoresSlice';
import alunosReducer from './slices/alunosSlice';
import contratosReducer from './slices/contratosSlice';

export const store = configureStore({
  reducer: {
    alunos: alunosReducer,
    professores: professoresReducer,
    contratos: contratosReducer,
    auth: authReducer,
  },
});
