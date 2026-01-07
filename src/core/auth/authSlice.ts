import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../constants';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
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
      action: PayloadAction<any>
    ) => {
      const payload = action.payload;
      console.log('setCredentials reducer called with:', payload);
      console.log('payload.tokens:', payload.tokens);
      console.log('payload.tokens type:', typeof payload.tokens);
      console.log('payload.tokens keys:', payload.tokens ? Object.keys(payload.tokens) : 'no tokens');
      
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
        
        console.log('Extracted tokens:', { access_token, refresh_token });
      } 
      // Handle format: {user, access_token, refresh_token}
      else if (payload.access_token) {
        user = payload.user;
        access_token = payload.access_token;
        refresh_token = payload.refresh_token;
      }
      else {
        console.error('Invalid credentials format:', payload);
        return;
      }

      if (!access_token || !refresh_token) {
        console.error('Tokens are empty! access_token:', access_token, 'refresh_token:', refresh_token);
        console.error('Full payload:', JSON.stringify(payload, null, 2));
        return;
      }

      console.log('Saving to state and localStorage:', { user, access_token, refresh_token });

      state.user = user;
      state.accessToken = access_token;
      state.refreshToken = refresh_token;

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
      
      console.log('Saved to localStorage, verifying...');
      console.log('Verification - token from localStorage:', localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
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
export const selectUserRole = (state: { auth: AuthState }) => state.auth.user?.role;
