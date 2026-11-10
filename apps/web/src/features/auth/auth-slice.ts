import type { AuthenticatedUser, AuthResponse, AuthTokens, RoleName } from '@career-portal/shared-types';
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { queryClient } from '@/app/query-client';
import { apiClient } from '@/shared/lib/api-client';
import { supabase } from '@/shared/lib/supabase';

async function persistSession(tokens: AuthTokens): Promise<void> {
  localStorage.setItem('supabase_access_token', tokens.accessToken);
  const { error } = await supabase.auth.setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken });
  if (error) {
    localStorage.removeItem('supabase_access_token');
    throw error;
  }
}

// ── State Shape ─────────────────────────────────────────────────────────

export interface AuthState {
  user: AuthenticatedUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean; // true once the initial session check completes
  error: string | null;
  profileRequestId?: string | undefined;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
};

// ── Async Thunks ────────────────────────────────────────────────────────

export const signUp = createAsyncThunk(
  'auth/signUp',
  async (
    payload: { email: string; password: string; fullName: string; role?: RoleName },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await apiClient.post<{ success: true; data: AuthResponse }>(
        '/api/v1/auth/signup',
        payload,
      );
      // Persist token for apiClient interceptor
      await persistSession(data.data.tokens);
      return data.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      return rejectWithValue(message);
    }
  },
);

export const signIn = createAsyncThunk(
  'auth/signIn',
  async (
    payload: { email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await apiClient.post<{ success: true; data: AuthResponse }>(
        '/api/v1/auth/signin',
        payload,
      );
      await persistSession(data.data.tokens);
      return data.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      return rejectWithValue(message);
    }
  },
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      await apiClient.post('/api/v1/auth/signout');
      localStorage.removeItem('supabase_access_token');
      await supabase.auth.signOut({ scope: 'local' });
      queryClient.clear();
      return undefined;
    } catch (err: unknown) {
      // Clear the persisted session even if the API is unreachable.
      await supabase.auth.signOut({ scope: 'local' });
      queryClient.clear();
      localStorage.removeItem('supabase_access_token');
      const message = err instanceof Error ? err.message : 'Sign out failed';
      return rejectWithValue(message);
    }
  },
);

export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<{ success: true; data: AuthenticatedUser }>(
        '/api/v1/auth/sync',
      );
      return data.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user';
      return rejectWithValue(message);
    }
  },
);

export const refreshSession = createAsyncThunk(
  'auth/refreshSession',
  async (refreshToken: string, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<{ success: true; data: AuthTokens }>(
        '/api/v1/auth/refresh',
        { refreshToken },
      );
      localStorage.setItem('supabase_access_token', data.data.accessToken);
      return data.data;
    } catch (err: unknown) {
      localStorage.removeItem('supabase_access_token');
      const message = err instanceof Error ? err.message : 'Session refresh failed';
      return rejectWithValue(message);
    }
  },
);

// ── Slice ────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setInitialized(state) {
      state.isInitialized = true;
    },
    setUser(state, action: PayloadAction<AuthenticatedUser | null>) {
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
    },
    setTokens(state, action: PayloadAction<AuthTokens | null>) {
      state.tokens = action.payload;
    },
    clearAuth(state) {
      state.profileRequestId = undefined;
      state.isLoading = false;
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Sign Up
    builder.addCase(signUp.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(signUp.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
    });
    builder.addCase(signUp.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Sign In
    builder.addCase(signIn.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(signIn.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
    });
    builder.addCase(signIn.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Sign Out
    builder.addCase(signOut.pending, (state) => {
      state.profileRequestId = undefined;
    });
    builder.addCase(signOut.fulfilled, (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    });

    // Fetch Me
    builder.addCase(fetchMe.pending, (state, action) => {
      state.profileRequestId = action.meta.requestId;
      if (!state.user) {
        state.isLoading = true;
      }
    });
    builder.addCase(fetchMe.fulfilled, (state, action) => {
      if (state.profileRequestId !== action.meta.requestId) return;
      state.profileRequestId = undefined;
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
    });
    builder.addCase(fetchMe.rejected, (state, action) => {
      if (state.profileRequestId !== action.meta.requestId) return;
      state.profileRequestId = undefined;
      state.isLoading = false;
      state.user = null;
      state.isAuthenticated = false;
    });

    // Refresh Session
    builder.addCase(refreshSession.fulfilled, (state, action) => {
      state.tokens = action.payload;
    });
    builder.addCase(refreshSession.rejected, (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
    });
  },
});

export const { setInitialized, setUser, setTokens, clearAuth, clearError } = authSlice.actions;
export const authReducer = authSlice.reducer;
