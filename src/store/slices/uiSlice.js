import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  loading: {
    isVisible: false,
    message: null,
  },
  toast: {
    isVisible: false,
    message: '',
    type: 'info', // 'success' | 'error' | 'warning' | 'info'
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      // If action.payload is boolean
      if (typeof action.payload === 'boolean') {
        state.loading.isVisible = action.payload;
        state.loading.message = null;
      } 
      // If action.payload is object { isVisible, message }
      else {
        state.loading.isVisible = action.payload.isVisible;
        state.loading.message = action.payload.message || null;
      }
    },
    showToast: (state, action) => {
      state.toast = {
        isVisible: true,
        message: action.payload.message,
        type: action.payload.type || 'info',
      };
    },
    hideToast: (state) => {
      state.toast.isVisible = false;
      // We keep message/type to allow exit animations to use them if needed, 
      // but usually not critical. 
    },
  },
});

export const { setLoading, showToast, hideToast } = uiSlice.actions;
export const getUiState = state => state.ui
export default uiSlice.reducer;
