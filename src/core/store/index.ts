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
  effect: async () => clearTokens(),
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
