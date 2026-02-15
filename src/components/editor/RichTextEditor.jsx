import React, { useCallback, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import './css/RichTextEditor.css'
import { CommentContextExtension } from './commentContext/commentContextExtension';
import CommentModal from './commentContext/CommentModal';
import ImageSizeModal from './imageNodes/ImageSizeModal';
import MenuBar from './MenuBar';
import ResizableImage from './imageNodes/ResizableImage';

const RichTextEditor = ({ 
  content, onUpdate, 
  editable = true, placeholder = 'Start writing...', 
  onImageUpload, highlightNewEdits = false, onEditorReady, 
  onRequestSave,
  handleRemoveActiveComment
}) => {
  const [commentModalPayload, setCommentModalPayload] = useState(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [pageInfo, setPageInfo] = useState({ current: 1, total: 1 });

  const editor = useEditor({
    extensions: [
      StarterKit,
      ResizableImage,
      Link,
      Placeholder,
      Highlight,
      CommentContextExtension.configure({
        onOpenCommentModal: (payload) => {
          setCommentModalPayload(payload);
          setCommentModalOpen(true);
        },
      }),
    ],
    content: content || '',
    editable: editable,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onUpdate(json);
      const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, ' ');
      const words = text ? text.trim().split(/\s+/).length : 0;
      const pageSize = 500;
      const total = Math.max(1, Math.ceil(words / pageSize));
      const selectionPos = editor.state.selection.from;
      const beforeText = editor.state.doc.textBetween(0, selectionPos, ' ');
      const beforeWords = beforeText ? beforeText.trim().split(/\s+/).length : 0;
      const current = Math.min(total, Math.max(1, Math.ceil(beforeWords / pageSize) || 1));
      setPageInfo({ current, total });
    },
  });

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor || !editable) return;
    if (highlightNewEdits) {
      // Ensure highlight mark stays active for new input
      editor.chain().focus().toggleHighlight({ color: '#fff3cd' }).run();
    }
  }, [editor, editable, highlightNewEdits]);

  const addImage = useCallback(() => {
    const url = window.prompt('Enter the URL of the image:');
    if (url) {
      editor.chain().focus().setImage({ src: url, width: '50%' }).run();
    }
  }, [editor]);

  // Sync external content prop into the editor when it changes
  useEffect(() => {
    if (!editor) return;
    if (content == null) return;
    // Avoid clobbering user input while typing; only hydrate when not focused
    if (editor?.isFocused) return;
    try {
      if (typeof content === 'string') {
        const currentHTML = editor.getHTML();
        if (currentHTML !== content) {
          editor.commands.setContent(content, false);
        }
      } else {
        const current = editor.getJSON();
        const next = content;
        if (JSON.stringify(current) !== JSON.stringify(next)) {
          editor.commands.setContent(next, false);
        }
      }
    } catch (e) {
      // no-op
    }
  }, [editor, content]);

  const [imageModal, setImageModal] = useState({ show: false, pos: null, widthPct: 50, src: '' });

  useEffect(() => {
    const handler = (ev) => {
      if (!editable) return;
      const { pos, width, src } = ev.detail || {};
      const pct = typeof width === 'string' && width.endsWith('%') ? parseInt(width, 10) : (width ? Math.round(parseFloat(width)) : 50);
      const clamped = Number.isFinite(pct) ? Math.min(100, Math.max(10, pct)) : 50;
      setImageModal({ show: true, pos, widthPct: clamped, src: src || '' });
    };
    document.addEventListener('rte-open-image-settings', handler);
    return () => document.removeEventListener('rte-open-image-settings', handler);
  }, [editable]);

  const applyImageSize = async () => {
    if (!editor || imageModal.pos == null) {
      setImageModal({ show: false, pos: null, widthPct: 50 });
      return;
    }
    const widthAttr = `${imageModal.widthPct}%`;
    editor.chain().focus().setNodeSelection(imageModal.pos).updateAttributes('image', { width: widthAttr }).run();
    setImageModal({ show: false, pos: null, widthPct: 50, src: '' });
    if (typeof onRequestSave === 'function') {
      await onRequestSave(editor.getJSON());
    }
  };

  const handleContainerMouseDown = (e) => {
    if (!editor) return;
    const pm = e.currentTarget.querySelector('.ProseMirror');
    if (pm && !pm.contains(e.target)) {
      e.preventDefault();
      editor.chain().focus('end').run();
    }
  };

  return (
    <>
      <div className="rich-text-editor border rounded bg-white d-flex flex-column" style={{ height: '100%', minHeight: '100%', overflow: 'hidden' }}>
        {editable && <MenuBar editor={editor} addImage={addImage} onImageUpload={onImageUpload} />}
        <div className="rte-content flex-grow-1 overflow-auto" onMouseDown={handleContainerMouseDown}>
          <EditorContent editor={editor} className="p-3 p-md-4" />
        </div>
        <div className="border-top small text-muted px-3 py-1 d-flex justify-content-end">
          <span>
            Page {pageInfo.current} of {pageInfo.total}
          </span>
        </div>

        <ImageSizeModal 
          imageModal={imageModal}
          setImageModal={setImageModal}
          applyImageSize={applyImageSize}
        />
      </div>

      <CommentModal
        show={commentModalOpen}
        onHide={() => {
          setCommentModalOpen(false); 
          setCommentModalPayload(null);
          handleRemoveActiveComment();
        }}
        payload={commentModalPayload}
      />
    </>
  );
};

export default RichTextEditor;
