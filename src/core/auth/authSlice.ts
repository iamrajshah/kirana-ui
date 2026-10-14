import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../constants';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionVersion: number;
  profileUpdateSequence: number;
  lastAppliedProfileUpdateSequence: number;
  profileUpdateRequests: Record<string, number>;
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

type CurrentUserProfileUpdate = Pick<User, 'id'> &
  Partial<Pick<User, 'name' | 'phone' | 'email'>> & {
    sessionVersion: number;
    requestId: string;
  };

interface ProfileUpdateRequest {
  requestId: string;
  userId: string;
  sessionVersion: number;
}

const storedUser: User | null = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null');

const initialState: AuthState = {
  user: storedUser,
  accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
  refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
  sessionVersion: storedUser ? 1 : 0,
  profileUpdateSequence: 0,
  lastAppliedProfileUpdateSequence: 0,
  profileUpdateRequests: {},
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

      if (!state.user || state.user.id !== user.id || !state.accessToken) {
        state.sessionVersion += 1;
        state.profileUpdateSequence = 0;
        state.lastAppliedProfileUpdateSequence = 0;
        state.profileUpdateRequests = {};
      }
      state.user = user;
      state.accessToken = access_token;
      state.refreshToken = refresh_token;

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
    },
    beginCurrentUserProfileUpdate: (state, action: PayloadAction<ProfileUpdateRequest>) => {
      if (!state.user || action.payload.userId !== state.user.id) return;
      if (action.payload.sessionVersion !== state.sessionVersion) return;

      state.profileUpdateSequence += 1;
      state.profileUpdateRequests[action.payload.requestId] = state.profileUpdateSequence;
    },
    updateCurrentUser: (state, action: PayloadAction<CurrentUserProfileUpdate>) => {
      if (!state.user) return;
      const requestSequence = state.profileUpdateRequests[action.payload.requestId];
      if (requestSequence === undefined) return;
      delete state.profileUpdateRequests[action.payload.requestId];
      if (action.payload.id !== state.user.id) return;
      if (action.payload.sessionVersion !== state.sessionVersion) return;
      if (requestSequence < state.lastAppliedProfileUpdateSequence) return;
      if (localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) !== state.accessToken) return;

      const { name, phone, email } = action.payload;
      state.user = {
        ...state.user,
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
      };
      state.lastAppliedProfileUpdateSequence = requestSequence;
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(state.user));
    },
    finishCurrentUserProfileUpdate: (state, action: PayloadAction<ProfileUpdateRequest>) => {
      delete state.profileUpdateRequests[action.payload.requestId];
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.sessionVersion += 1;
      state.profileUpdateSequence = 0;
      state.lastAppliedProfileUpdateSequence = 0;
      state.profileUpdateRequests = {};

      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    },
  },
});

export const {
  setCredentials,
  beginCurrentUserProfileUpdate,
  updateCurrentUser,
  finishCurrentUserProfileUpdate,
  logout,
} = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => !!state.auth.accessToken;
export const selectUserRole = (state: { auth: AuthState }) => state.auth.user?.roles?.[0];
