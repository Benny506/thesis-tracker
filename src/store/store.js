import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import writingReducer from './slices/writingSlice';
import unreadReducer from './slices/unreadSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    writing: writingReducer,
    unread: unreadReducer,
  },
});
