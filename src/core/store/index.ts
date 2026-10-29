import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice } from '../api/apiSlice';
import authReducer, {
  hydrateSessionTokens,
  logout,
  setCredentials,
  updateTokens,
} from '../auth/authSlice';
import { clearTokens, persistTokens } from '../auth/tokenVault';

const authPersistence = createListenerMiddleware();
authPersistence.startListening({
  matcher: isAnyOf(setCredentials, updateTokens, hydrateSessionTokens),
  effect: async (_action, api) => {
    const auth = (api.getState() as { auth: { accessToken: string | null; refreshToken: string | null } })
      .auth;
    if (auth.accessToken && auth.refreshToken) {
      await persistTokens({ accessToken: auth.accessToken, refreshToken: auth.refreshToken });
    }
  },
});
authPersistence.startListening({
  actionCreator: logout,
  effect: async (_action, api) => {
    api.dispatch(apiSlice.util.resetApiState());
    await clearTokens();
  },
});

authPersistence.startListening({
  actionCreator: setCredentials,
  effect: (_action, api) => {
    const previous = api.getOriginalState() as {
      auth: { user: { id: string; tenant?: { id?: string } } | null };
    };
    const current = api.getState() as {
      auth: { user: { id: string; tenant?: { id?: string } } | null };
    };
    const previousSession = previous.auth.user
      ? `${previous.auth.user.id}:${previous.auth.user.tenant?.id ?? ''}`
      : null;
    const currentSession = current.auth.user
      ? `${current.auth.user.id}:${current.auth.user.tenant?.id ?? ''}`
      : null;
    if (previousSession !== currentSession) {
      api.dispatch(apiSlice.util.resetApiState());
    }
  },
});

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(authPersistence.middleware).concat(apiSlice.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
