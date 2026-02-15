import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const CommentPluginKey = new PluginKey('commentPlugin')

/**
 * Escape special regex characters in a string
 */
export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Resolve comment positions in the document safely.
 * Supports multiple identical occurrences using prefix/suffix and occurrence index
 */
function resolveCommentPositionMulti(doc, comment) {
  const fullText = doc.textBetween(0, doc.content.size, '\n', '\n')
  const { exact_match, prefix = '', suffix = '', occurrence = 0 } = comment

  if (!exact_match) return null

  // 1️⃣ Find all occurrences
  const regex = new RegExp(escapeRegExp(exact_match), 'g')
  const matches = []
  let match
  while ((match = regex.exec(fullText)) !== null) {
    matches.push({ start: match.index, end: match.index + exact_match.length })
  }

  if (!matches.length) return null

  // 2️⃣ Apply occurrence index
  let selected = matches[occurrence] || matches[0]

  // 3️⃣ Validate prefix
  if (prefix) {
    const actualPrefix = fullText.slice(
      Math.max(0, selected.start - prefix.length),
      selected.start
    )
    if (actualPrefix !== prefix) {
      console.warn(`⚠ Prefix mismatch for comment ${comment.id}`)
    }
  }

  // 4️⃣ Validate suffix
  if (suffix) {
    const actualSuffix = fullText.slice(selected.end, selected.end + suffix.length)
    if (actualSuffix !== suffix) {
      console.warn(`⚠ Suffix mismatch for comment ${comment.id}`)
    }
  }

  // ProseMirror positions start at 1
  return { from: selected.start + 1, to: selected.end }
}

export const CommentExtension = Extension.create({
  name: 'commentExtension',

  addCommands() {
    return {
      // ============================
      // 🔹 Hydrate all comments from DB
      // ============================
      setComments:
        (commentsArray) =>
          ({ state, dispatch }) => {
            const tr = state.tr.setMeta(CommentPluginKey, {
              type: 'setAll',
              comments: commentsArray,
            })
            dispatch(tr)
            return true
          },

      // ============================
      // 🔹 Activate / toggle a comment
      // ============================
      goToComment:
        (id) =>
          ({ state, dispatch }) => {
            const pluginState = CommentPluginKey.getState(state)
            const comment = pluginState.comments.get(id)
            if (!comment || typeof comment.from !== 'number' || typeof comment.to !== 'number') {
              console.warn(`❌ Cannot go to comment ${id}, position missing`)
              return false
            }

            const isSameActive = pluginState.activeCommentId === id
            const tr = state.tr

            if (isSameActive) {
              // Toggle off
              tr.setMeta(CommentPluginKey, { type: 'deactivate' })
            } else {
              tr.setSelection(TextSelection.create(state.doc, comment.from, comment.to))
                .setMeta(CommentPluginKey, { type: 'activate', id })
                .scrollIntoView()
            }

            dispatch(tr)
            return true
          },

      clearActiveComment:
        () =>
          ({ state, dispatch }) => {
            dispatch(state.tr.setMeta(CommentPluginKey, { type: 'deactivate' }))
            return true
          },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: CommentPluginKey,

        state: {
          init() {
            return {
              comments: new Map(),
              activeCommentId: null,
              decorations: DecorationSet.empty,
            }
          },

          apply(tr, pluginState) {
            let { comments, activeCommentId } = pluginState

            const meta = tr.getMeta(CommentPluginKey)

            // ============================
            // 🔹 Hydrate / resolve positions
            // ============================
            if (meta?.type === 'setAll') {
              const map = new Map()

              meta.comments.forEach(c => {
                const resolved = resolveCommentPositionMulti(tr.doc, c)
                if (resolved) {
                  map.set(c.id, {
                    ...c,
                    from: resolved.from,
                    to: resolved.to,
                  })
                } else {
                  console.warn(`❌ Could not resolve position for comment ${c.id}`)
                }
              })

              comments = map
              activeCommentId = null
            }

            // ============================
            // 🔹 Activate / deactivate
            // ============================
            if (meta?.type === 'activate') {
              activeCommentId = meta.id
            }

            if (meta?.type === 'deactivate') {
              activeCommentId = null
            }

            // ============================
            // 🔹 Decorations for active comment
            // ============================
            const decorations = []

            if (activeCommentId && comments.has(activeCommentId)) {
              const active = comments.get(activeCommentId)
              decorations.push(
                Decoration.inline(active.from, active.to, {
                  class: 'rte-comment-highlight-active',
                  'data-comment-id': active.id,
                })
              )
            }

            return {
              comments,
              activeCommentId,
              decorations: DecorationSet.create(tr.doc, decorations),
            }
          },
        },

        props: {
          decorations(state) {
            return this.getState(state).decorations
          },
        },
      }),
    ]
  },
})
