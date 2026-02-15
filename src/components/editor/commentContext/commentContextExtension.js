import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const CommentContextPluginKey = new PluginKey('commentContext');

function resolveCommentRange(doc, comment) {
  const exact = comment.exact_match || comment.selected_text || '';
  if (!exact) return null;

  const fullText = doc.textBetween(0, doc.content.size, '\n', '\n');
  const prefix = comment.prefix || '';
  const suffix = comment.suffix || '';

  const indices = [];
  let idx = fullText.indexOf(exact);
  while (idx !== -1) {
    indices.push(idx);
    idx = fullText.indexOf(exact, idx + 1);
  }

  if (!indices.length) {
    console.log('[commentContext] resolveCommentRange: no occurrences for', comment.id);
    return null;
  }

  let bestOffset = indices[0];
  if (prefix || suffix) {
    let bestScore = -1;
    indices.forEach((start) => {
      const end = start + exact.length;
      let score = 0;
      if (prefix) {
        const actualPrefix = fullText.slice(Math.max(0, start - prefix.length), start);
        if (actualPrefix === prefix) score += 2;
      }
      if (suffix) {
        const actualSuffix = fullText.slice(end, end + suffix.length);
        if (actualSuffix === suffix) score += 2;
      }
      if (score > bestScore) {
        bestScore = score;
        bestOffset = start;
      }
    });
  }

  let acc = 0;
  let from = 1;
  let to = 1;
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const len = node.text.length;
      if (bestOffset >= acc && bestOffset < acc + len) {
        from = pos + (bestOffset - acc);
        to = from + exact.length;
      }
      acc += len;
    }
    return true;
  });

  console.log('[commentContext] resolveCommentRange: resolved', comment.id, { from, to });
  return { from, to };
}

export const CommentContextExtension = Extension.create({
  name: 'commentContextExtension',

  addOptions() {
    return {
      onOpenCommentModal: null,
    };
  },

  addCommands() {
    return {
      commentContextSetComments:
        (commentsArray) =>
        ({ state, dispatch }) => {
          console.log('[commentContext] hydrate', commentsArray?.length ?? 0);
          const tr = state.tr.setMeta(CommentContextPluginKey, {
            type: 'setAll',
            comments: commentsArray || [],
          });
          dispatch(tr);
          return true;
        },

      commentContextGoToComment:
        (comment) =>
        ({ state, dispatch, view }) => {
          if (!comment || !comment.id) return false;

          const pluginState = CommentContextPluginKey.getState(state);
          const stored = pluginState.comments.get(comment.id) || comment;
          const resolved = resolveCommentRange(state.doc, stored);

          const tr = state.tr;
          if (resolved) {
            tr.setSelection(TextSelection.create(state.doc, resolved.from, resolved.to))
              .setMeta(CommentContextPluginKey, { type: 'activate', id: comment.id })
              .scrollIntoView();
            dispatch(tr);
          } else {
            dispatch(
              tr.setMeta(CommentContextPluginKey, { type: 'deactivate' })
            );
          }

          const opts = this.options;
          if (typeof opts.onOpenCommentModal === 'function') {
            console.log('[commentContext] open modal for', comment.id, 'found:', !!resolved);
            opts.onOpenCommentModal({
              comment: stored,
              found: !!resolved,
            });
          }

          return true;
        },

      commentContextSetActive:
        (id) =>
        ({ state, dispatch }) => {
          const tr = state.tr.setMeta(CommentContextPluginKey, {
            type: id ? 'activate' : 'deactivate',
            id,
          });
          dispatch(tr);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: CommentContextPluginKey,

        state: {
          init() {
            return {
              comments: new Map(),
              activeCommentId: null,
              decorations: DecorationSet.empty,
            };
          },

          apply(tr, pluginState) {
            let { comments, activeCommentId } = pluginState;
            const meta = tr.getMeta(CommentContextPluginKey);

            if (meta?.type === 'setAll') {
              console.log('[commentContext] plugin hydrate');
              const map = new Map();
              meta.comments.forEach((c) => {
                const resolved = resolveCommentRange(tr.doc, c);
                map.set(c.id, {
                  ...c,
                  from: resolved?.from,
                  to: resolved?.to,
                });
              });
              comments = map;
              activeCommentId = null;
            }

            if (meta?.type === 'activate') {
              activeCommentId = meta.id;
            }

            if (meta?.type === 'deactivate') {
              activeCommentId = null;
            }

            const decorations = [];
            if (activeCommentId && comments.has(activeCommentId)) {
              const active = comments.get(activeCommentId);
              if (typeof active.from === 'number' && typeof active.to === 'number') {
                decorations.push(
                  Decoration.inline(active.from, active.to, {
                    class: 'rte-comment-highlight-active',
                    'data-comment-id': active.id,
                  })
                );
              }
            }

            return {
              comments,
              activeCommentId,
              decorations: DecorationSet.create(tr.doc, decorations),
            };
          },
        },

        props: {
          decorations(state) {
            const pluginState = this.getState(state);
            return pluginState.decorations;
          },
        },
      }),
    ];
  },
});

