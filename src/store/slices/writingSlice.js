import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  byId: {},
};

const writingSlice = createSlice({
  name: 'writing',
  initialState,
  reducers: {
    setDraft: (state, action) => {
      const { chapterId, content } = action.payload;
      state.byId[chapterId] = {
        content,
        updatedAt: Date.now(),
      };
    },
    clearDraft: (state, action) => {
      const { chapterId } = action.payload;
      delete state.byId[chapterId];
    },
    clearAllDrafts: (state) => {
      state.byId = {};
    },
  },
});

export const { setDraft, clearDraft, clearAllDrafts } = writingSlice.actions;
export default writingSlice.reducer;

