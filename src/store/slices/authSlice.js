import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { STATUS } from '@/constants';
import { LoiginService } from '@/services/auth/loginService';
import { LogoutService } from '@/services/auth/logoutService';
import { RefreshTokenService } from '@/services/auth/refreshTokenService';

// LOGIN
export const login = createAsyncThunk(
  'auth/login',
  async (data, { rejectWithValue }) => {
    try {
      const res = await LoiginService.handle(data);
      return res.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro ao logar';
      const validationErrors = error.response?.data?.errors || [];
      return rejectWithValue({
        message: errorMessage,
        errors: validationErrors,
      });
    }
  }
);

// LOGOUT
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const res = await LogoutService.handle();
      return res.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro ao deslogar';
      return rejectWithValue({ message: errorMessage });
    }
  }
);

// REFRESH TOKEN
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (data, { rejectWithValue }) => {
    try {
      const res = await RefreshTokenService.handle(data);
      return res.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Erro ao atualizar token';
      return rejectWithValue({ message: errorMessage });
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    accessToken: null,
    refreshToken: null,
    tokenType: null,
    expiresIn: null,
    user: null,
    loading: false,
    status: STATUS.IDLE,
    action: null,
    message: null,
    errors: [],
  },
  reducers: {
    clearErrors: state => {
      state.errors = [];
      state.message = null;
    },
    clearStatus: state => {
      state.status = STATUS.IDLE;
    },
  },
  extraReducers: builder => {
    builder
      // login
      .addCase(login.pending, state => {
        state.status = STATUS.LOADING;
        state.loading = true;
        state.errors = [];
        state.message = null;
        state.action = 'login';
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = STATUS.SUCCESS;
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.tokenType = action.payload.tokenType;
        state.expiresIn = action.payload.expiresIn;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.loading = false;
        state.errors = action.payload?.errors || [];
        state.message = action.payload?.message || 'Erro ao logar';
      })
      // logout
      .addCase(logout.pending, state => {
        state.status = STATUS.LOADING;
        state.loading = true;
        state.errors = [];
        state.message = null;
        state.action = 'logout';
      })
      .addCase(logout.fulfilled, (state, action) => {
        state.status = STATUS.SUCCESS;
        state.loading = false;
        state.accessToken = null;
        state.refreshToken = null;
        state.tokenType = null;
        state.expiresIn = null;
        state.user = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.loading = false;
        state.errors = action.payload?.errors || [];
        state.message = action.payload?.message || 'Erro ao deslogar';
      })
      // refreshToken
      .addCase(refreshToken.pending, state => {
        state.status = STATUS.LOADING;
        state.loading = true;
        state.errors = [];
        state.message = null;
        state.action = 'refreshToken';
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.status = STATUS.SUCCESS;
        state.loading = false;
        state.user = null;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.status = STATUS.FAILED;
        state.loading = false;
        state.errors = action.payload?.errors || [];
        state.message = action.payload?.message || 'Erro ao atualizar token';
      });
  },
});

export const clearErrors = authSlice.actions.clearErrors;
export const clearStatus = authSlice.actions.clearStatus;
export default authSlice.reducer;
