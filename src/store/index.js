'use client';

import { configureStore } from '@reduxjs/toolkit';
import professoresReducer from './slices/professoresSlice';

export const store = configureStore({
  reducer: {
    professores: professoresReducer,
  },
});
