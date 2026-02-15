import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  totalComments: 0,
  byChapter: {},
};

const unreadSlice = createSlice({
  name: 'unread',
  initialState,
  reducers: {
    setUnreadFromContext: (state, action) => {
      const rows = Array.isArray(action.payload) ? action.payload : [];
      state.totalComments = 0;
      state.byChapter = {};

      rows.forEach((row) => {
        const chapterId = row.chapter_id;
        if (!chapterId) return;

        const createdAt = row.created_at || row.createdAt || null;
        if (!state.byChapter[chapterId]) {
          state.byChapter[chapterId] = { count: 0, latest: null };
        }

        state.byChapter[chapterId].count += 1;
        state.totalComments += 1;

        if (createdAt) {
          const prev = state.byChapter[chapterId].latest;
          if (!prev || new Date(createdAt) > new Date(prev)) {
            state.byChapter[chapterId].latest = createdAt;
          }
        }
      });
    },
    setTotalUnreadComments: (state, action) => {
      const value = typeof action.payload === 'number' ? action.payload : 0;
      state.totalComments = value < 0 ? 0 : value;
    },
    decrementUnreadForChapter: (state, action) => {
      const chapterId =
        action && action.payload && action.payload.chapterId
          ? action.payload.chapterId
          : null;
      if (!chapterId || !state.byChapter[chapterId]) return;

      const entry = state.byChapter[chapterId];
      if (entry.count > 0) {
        entry.count -= 1;
        if (state.totalComments > 0) {
          state.totalComments -= 1;
        }
      }

      if (entry.count <= 0) {
        delete state.byChapter[chapterId];
      }
    },
  },
});

export const {
  setUnreadFromContext,
  setTotalUnreadComments,
  decrementUnreadForChapter,
} = unreadSlice.actions;
export default unreadSlice.reducer;
