import { configureStore } from '@reduxjs/toolkit';

import { authReducer } from '@/features/auth/auth-slice';

/**
 * Composition root for Redux state. Feature slices (auth, notifications UI
 * state, etc.) are added to `reducer` as they're built in later phases —
 * this file itself should stay free of business logic.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
