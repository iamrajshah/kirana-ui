import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../constants';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface CredentialsPayload {
  user: User;
  tenant?: User['tenant'];
  tokens?: {
    access_token?: string;
    accessToken?: string;
    access?: string;
    refresh_token?: string;
    refreshToken?: string;
    refresh?: string;
  };
  access_token?: string;
  refresh_token?: string;
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null'),
  accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
  refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<CredentialsPayload>
    ) => {
      const payload = action.payload;

      let user: User;
      let access_token: string;
      let refresh_token: string;

      // Handle response format: {user, tenant, tokens: {accessToken, refreshToken}}
      if (payload.tokens) {
        // Merge tenant info into user object
        user = {
          ...payload.user,
          tenant: payload.tenant
        };
        // Try different possible property names
        access_token = payload.tokens.access_token || payload.tokens.accessToken || payload.tokens.access || '';
        refresh_token = payload.tokens.refresh_token || payload.tokens.refreshToken || payload.tokens.refresh || '';
      } 
      // Handle format: {user, access_token, refresh_token}
      else if (payload.access_token) {
        user = payload.user;
        access_token = payload.access_token;
        refresh_token = payload.refresh_token;
      }
      else {
        return;
      }

      if (!access_token || !refresh_token) {
        return;
      }

      state.user = user;
      state.accessToken = access_token;
      state.refreshToken = refresh_token;

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;

      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => !!state.auth.accessToken;
export const selectUserRole = (state: { auth: AuthState }) => state.auth.user?.roles?.[0];
