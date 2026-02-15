import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Spinner, Form, Badge, Alert, Offcanvas } from 'react-bootstrap';
import RichTextEditor from '../RichTextEditor';
import { supabase } from '../../../lib/supabase';
import { showToast, setLoading } from '../../../store/slices/uiSlice';
import { useDispatch, useSelector } from 'react-redux';
import { setDraft } from '../../../store/slices/writingSlice';
import { decrementUnreadForChapter } from '../../../store/slices/unreadSlice';
import mammoth from 'mammoth';
import { FaFileWord, FaSave, FaTimes, FaCheck, FaBan, FaBolt, FaCommentDots } from 'react-icons/fa';
import ConfirmModal from '../../ui/ConfirmModal';
import TextInputModal from '../../ui/TextInputModal';
import { useAuth } from '../../../context/AuthContext';
import '../css/ChapterEditorModal.css';
import ForceViewModal from '../comments/ForceViewModal';
import CommentViewModal from '../comments/CommentViewModal';
import ActionsOffCanvas from '../offCanvas/ActionsOffCanvas';
import ReviewOffCanvas from '../offCanvas/ReviewOffCanvas';
import EditorModalBody from './EditorModalBody';
import EditorModalHeader from './EditorModalHeader';
import { createComment } from '../comments/commentService';

const ChapterEditorModal = ({ show, onHide, chapter, onSave, userRole = 'student' }) => {
  const dispatch = useDispatch();

  const draftContent = useSelector(state => (chapter ? state.writing?.byId?.[chapter.id]?.content : null));
  const { user } = useAuth();

  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [hasHighlights, setHasHighlights] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [editorRef, setEditorRef] = useState(null);
  const [comments, setComments] = useState([]);
  const [edits, setEdits] = useState([]);
  const [confirm, setConfirm] = useState({ show: false, title: '', message: '', action: null, variant: 'danger', confirmLabel: 'Confirm' });
  const [commentModal, setCommentModal] = useState({ show: false, oldText: '', defaultValue: '', selection: null });
  const [forceModal, setForceModal] = useState({ show: false, oldText: '', defaultValue: '' });
  const [showReview, setShowReview] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [compareModal, setCompareModal] = useState({ show: false, oldText: '', newText: '', prefix: '', suffix: '' });
  const [forceViewModal, setForceViewModal] = useState({ show: false, oldText: '', newText: '' });

  useEffect(() => {
    if (!editorRef) return;
    if (!comments?.length) return;
    if (editorRef.state.doc.content.size === 0) return;
    try {
      editorRef.commands.commentContextSetComments(comments);
    } catch (e) {
      console.log('[commentContext] failed to hydrate comments', e);
    }
  }, [editorRef, comments, show]);

  useEffect(() => {
    if (chapter && show) {
      if (draftContent) {
        setContent(draftContent);
      } else {
        const body = chapter.body;
        if (body && typeof body === 'object' && body.doc) {
          setContent(body.doc);
        } else if (body && typeof body === 'object') {
          setContent(body);
        } else {
          setContent('');
        }
      }

      // Fetch comments and edits from DB
      (async () => {
        try {
          const [cmRes, edRes] = await Promise.all([
            supabase.from('chapter_comments_context').select('*').eq('chapter_id', chapter.id).order('created_at', { ascending: false }),
            supabase.from('chapter_edits').select('*').eq('chapter_id', chapter.id).eq('status', 'pending').order('created_at', { ascending: false })
          ]);
          if (cmRes.error) throw cmRes.error;
          if (edRes.error) throw edRes.error;

          setComments(cmRes.data || []);
          setEdits(edRes.data || []);
        } catch (e) {
          console.error('Failed to load review artifacts', e);
        }
      })();
      setLastSaved(chapter.last_edited_at);
      setIsDirty(false);
    }
  }, [chapter, show, draftContent]);

  const handleEditorUpdate = (jsonContent) => {
    setContent(jsonContent);
    setIsDirty(true);
    if (chapter?.id) {
      dispatch(setDraft({ chapterId: chapter.id, content: jsonContent }));
    }
    try {
      const text = typeof jsonContent === 'string' ? jsonContent : JSON.stringify(jsonContent);
      setHasHighlights(text.includes('"type":"highlight"') || text.includes('<mark'));
    } catch {
      // ignore
    }
  };

  // Auto-save logic
  useEffect(() => {
    if (!isDirty || !content) return;

    const timer = setTimeout(async () => {
      setAutoSaving(true);
      await handleSave(null, true); // Silent save
      setAutoSaving(false);
      setIsDirty(false);
    }, 3000); // 3 seconds debounce

    return () => clearTimeout(timer);
  }, [content, isDirty]);

  useEffect(() => {
    if (!show) return;
    const onHideLike = () => {
      if (isDirty && content) {
        handleSave(null, true);
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden' && isDirty && content) {
        handleSave(null, true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHideLike);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHideLike);
    };
  }, [show]);

  const handleSave = async (statusUpdate = null, silent = false, overrideContent = null) => {
    if (!chapter) return;
    if (!silent) setSaving(true);

    try {
      if (!silent) dispatch(setLoading({ isVisible: true, message: 'Saving chapter...' }));
      const now = new Date().toISOString();
      const bodyContent = overrideContent ?? content;
      const updates = {
        body: bodyContent,
        last_edited_at: now
      };

      if (statusUpdate) {
        updates.status = statusUpdate;
      } else {
        if (userRole === 'student' && chapter?.status === 'approved') {
          updates.status = 'submitted';
        }
      }

      const { error } = await supabase
        .from('chapters')
        .update(updates)
        .eq('id', chapter.id);

      if (error) throw error;

      setLastSaved(now);
      setIsDirty(false);
      if (chapter?.id) {
        dispatch(setDraft({ chapterId: chapter.id, content: bodyContent }));
      }
      if (!silent) {
        dispatch(showToast({
          message: statusUpdate ? `Chapter ${statusUpdate.replace('_', ' ')}!` : 'Chapter saved successfully!',
          type: 'success'
        }));
        if (onSave) onSave();
      }
      return true;
    } catch (err) {
      console.error(err);
      if (!silent) dispatch(showToast({ message: 'Failed to save chapter', type: 'error' }));
      return false;
    } finally {
      if (!silent) setSaving(false);
      if (!silent) dispatch(setLoading(false));
    }
  };

  const handleImageUpload = async (file) => {
    if (!chapter) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${chapter.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chapter-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chapter-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const openConfirm = (action) => {
    if (!chapter) return;
    if (action === 'submit') {
      setConfirm({
        show: true,
        title: 'Submit for Review',
        message: 'Are you sure you want to submit this chapter? You will not be able to edit it until your supervisor responds.',
        action: 'submit',
        variant: 'primary',
        confirmLabel: 'Submit'
      });
    } else if (action === 'approve') {
      setConfirm({
        show: true,
        title: 'Approve Chapter',
        message: 'Approve this chapter? This marks it as completed.',
        action: 'approve',
        variant: 'success',
        confirmLabel: 'Approve'
      });
    } else if (action === 'changes') {
      setConfirm({
        show: true,
        title: 'Request Changes',
        message: 'Request changes for this chapter?',
        action: 'changes',
        variant: 'warning',
        confirmLabel: 'Request Changes'
      });
    }
  };

  const handleConfirm = async () => {
    try {
      dispatch(setLoading({ isVisible: true, message: 'Processing...' }));
      if (confirm.action === 'submit') {
        await handleSave('submitted');
      } else if (confirm.action === 'approve') {
        await handleSave('approved');
      } else if (confirm.action === 'changes') {
        await handleSave('changes_requested');
      }
    } finally {
      dispatch(setLoading(false));
    }
    setConfirm({ ...confirm, show: false });
  };

  // const handleAddComment = async () => {
  //   if (!editorRef) {
  //     dispatch(showToast({ message: 'Editor not ready', type: 'error' }));
  //     return;
  //   }
  //   const { from, to, empty } = editorRef.state.selection;
  //   if (empty) {
  //     dispatch(showToast({ message: 'Select text to comment on', type: 'error' }));
  //     return;
  //   }
  //   setCommentModal({ show: true, oldText: editorRef.state.doc.textBetween(from, to, '\n'), defaultValue: '' });
  // };

  const handleAddComment = () => {
    if (!editorRef) {
      dispatch(showToast({ message: 'Editor not ready', type: 'error' }));
      return;
    }

    const selection = editorRef.state.selection;

    if (selection.empty) {
      dispatch(showToast({ message: 'Select text to comment on', type: 'error' }));
      return;
    }

    const selectedText = editorRef.state.doc.textBetween(
      selection.from,
      selection.to,
      '\n'
    );

    setCommentModal({
      show: true,
      selection: { from: selection.from, to: selection.to },
      defaultValue: '',
      oldText: selectedText,
    });
  };

  const handleGoToComment = (comment) => {
    if (!editorRef) return;
    setActiveCommentId(comment.id);
    try {
      editorRef.commands.commentContextGoToComment(comment);
    } catch (e) {
      console.log('[commentContext] goToComment error', e);
    }
  };

  const handleRemoveActiveComment = () => {
    if (!editorRef) return;
    try {
      editorRef.commands.commentContextSetActive(null);
    } catch {}
    setActiveCommentId(null);
  };

  const handleMarkRead = async (id) => {
    const current = comments.find((c) => c.id === id);
    const chapterId = current?.chapter_id;
    try {
      dispatch(setLoading({ isVisible: true, message: 'Updating comment...' }));
      const { data, error } = await supabase
        .from('chapter_comments_context')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      setComments((prev) => prev.map((c) => (c.id === id ? data : c)));
      if (chapterId) {
        dispatch(decrementUnreadForChapter({ chapterId }));
      }
    } catch (e) {
      dispatch(showToast({ message: 'Failed to mark as read', type: 'error' }));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleForceUpdate = async () => {
    if (!editorRef) {
      dispatch(showToast({ message: 'Editor not ready', type: 'error' }));
      return;
    }
    const { from, to, empty } = editorRef.state.selection;
    if (empty) {
      dispatch(showToast({ message: 'Select text to replace', type: 'error' }));
      return;
    }
    setForceModal({ show: true, oldText: editorRef.state.doc.textBetween(from, to, '\n'), defaultValue: '' });
  };

  const handleGoToEdit = (eitem) => {
    if (!editorRef) return;
    const doc = editorRef.state.doc;
    let from = eitem.from_pos, to = eitem.to_pos;
    const valid = (p) => p >= 1 && p <= doc.content.size - 1;
    let found = null;
    if (valid(from) && valid(to) && doc.textBetween(from, to, '\n').length > 0) {
      found = { from, to };
    } else {
      const tryStrings = [eitem.old_text, eitem.new_text].filter(Boolean);
      for (const needle of tryStrings) {
        doc.descendants((node, pos) => {
          if (node.isText) {
            const idx = node.text.indexOf(needle);
            if (idx !== -1) {
              found = { from: pos + 1 + idx, to: pos + 1 + idx + needle.length };
              return false;
            }
          }
          return true;
        });
        if (found) break;
      }
    }
    if (found) {
      editorRef.chain().focus().setTextSelection(found).scrollIntoView().setHighlight({ color: '#fff3cd' }).run();
    } else {
      dispatch(showToast({ message: 'Text not found. It may have changed.', type: 'warning' }));
    }
  };

  // Auto-highlight the first pending force update when modal opens (student only)
  useEffect(() => {
    if (!show) return;
    if (userRole !== 'student') return;
    if (!editorRef) return;
    if (!edits || edits.length === 0) return;
    try {
      // Persistently highlight the first pending force update
      const eitem = edits[0];
      const doc = editorRef.state.doc;
      let from = eitem.from_pos, to = eitem.to_pos;
      const valid = (p) => p >= 1 && p <= doc.content.size - 1;
      let found = null;
      if (valid(from) && valid(to) && doc.textBetween(from, to, '\n').length > 0) {
        found = { from, to };
      } else {
        const tryStrings = [eitem.old_text, eitem.new_text].filter(Boolean);
        for (const needle of tryStrings) {
          doc.descendants((node, pos) => {
            if (node.isText) {
              const idx = node.text.indexOf(needle);
              if (idx !== -1) {
                found = { from: pos + 1 + idx, to: pos + 1 + idx + needle.length };
                return false;
              }
            }
            return true;
          });
          if (found) break;
        }
      }
      if (found) {
        editorRef.chain().focus().setTextSelection(found).scrollIntoView().setHighlight({ color: '#fff3cd' }).run();
      }
    } catch { }
  }, [show, userRole, editorRef, edits]);

  const handleAcceptEdit = async (eitem) => {
    if (!editorRef) return;
    try {
      dispatch(setLoading({ isVisible: true, message: 'Applying change...' }));
      editorRef.chain().focus().setTextSelection({ from: eitem.from_pos, to: eitem.to_pos }).insertContent(eitem.new_text).run();
      // Persist chapter body
      await handleSave(null, true);
      // Mark edit accepted
      const { data, error } = await supabase.from('chapter_edits').update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      }).eq('id', eitem.id).select('*').single();
      if (error) throw error;
      setEdits(prev => {
        const nextList = prev.filter(e => e.id !== eitem.id);
        if (userRole === 'student' && nextList.length > 0) {
          setTimeout(() => {
            try { handleGoToEdit(nextList[0]); } catch { }
          }, 50);
        }
        return nextList;
      });
      dispatch(showToast({ message: 'Change accepted', type: 'success' }));
    } catch (e) {
      dispatch(showToast({ message: 'Failed to accept change', type: 'error' }));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });

      if (content && Object.keys(content).length > 0) {
        if (!window.confirm('This will overwrite your current content. Continue?')) {
          setImporting(false);
          return;
        }
      }

      setContent(result.value);
      dispatch(showToast({ message: 'Document imported successfully!', type: 'success' }));

    } catch (err) {
      console.error(err);
      dispatch(showToast({ message: 'Failed to import Word document', type: 'error' }));
    } finally {
      setImporting(false);
      e.target.value = null;
    }
  };

  const handleCloseAttempt = async () => {
    let saved;

    if(chapter?.status !== 'approved'){
      saved = userRole === 'student' ? handleSave() : true
    
    } else{
      saved = true
    }

    if (saved) {
      onHide && onHide();
    }
  };

  const hasChildModalOpen =
    commentModal.show ||
    forceModal.show ||
    confirm.show ||
    compareModal.show ||
    forceViewModal.show;

  return (
    <Modal show={show} onHide={handleCloseAttempt} fullscreen>
      <div className="position-relative">
        {hasChildModalOpen && (
          <div
            className="position-absolute top-0 start-0 w-100 h-100"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 1 }}
          />
        )}
      <EditorModalHeader
        chapter={chapter}
        autoSaving={autoSaving}
        lastSaved={lastSaved}
        userRole={userRole}
        handleFileUpload={handleFileUpload}
        openConfirm={openConfirm}
        handleSave={handleSave}
        setShowActions={setShowActions}
        setShowReview={setShowReview}
        handleCloseAttempt={handleCloseAttempt}
        saving={saving}
        importing={importing}
        edits={edits}
      />

      <EditorModalBody
        userRole={userRole}
        chapter={chapter}
        edits={edits}
        handleAddComment={handleAddComment}
        handleForceUpdate={handleForceUpdate}
        comments={comments}
        setCompareModal={setCompareModal}
        handleGoToComment={handleGoToComment}
        handleMarkRead={handleMarkRead}
        handleEditorUpdate={handleEditorUpdate}
        handleImageUpload={handleImageUpload}
        setEditorRef={setEditorRef}
        handleSave={handleSave}
        content={content}
        handleRemoveActiveComment={handleRemoveActiveComment}
        activeCommentId={activeCommentId}
      />

      <ReviewOffCanvas
        showReview={showReview}
        setShowReview={setShowReview}
        userRole={userRole}
        edits={edits}
        handleAcceptEdit={handleAcceptEdit}
        handleForceUpdate={handleForceUpdate}
        handleAddComment={handleAddComment}
        handleGoToComment={handleGoToComment}
        handleRemoveActiveComment={handleRemoveActiveComment}
        handleGoToEdit={handleGoToEdit}
        handleMarkRead={handleMarkRead}
        comments={comments}
        activeCommentId={activeCommentId}
      />

      <ActionsOffCanvas
        showActions={showActions}
        setShowActions={setShowActions}
        userRole={userRole}
        openConfirm={openConfirm}
        handleFileUpload={handleFileUpload}
        chapter={chapter}
      />

      <TextInputModal
        show={commentModal.show}
        title="Add Comment"
        placeholder="Comment"
        confirmLabel="Add"
        onCancel={() => setCommentModal({ show: false, oldText: '', defaultValue: '', selection: null })}
        // onConfirm={async (val) => {
        //   dispatch(setLoading({ isVisible: true, message: 'Adding comment...' }));
        //   try {
        //     const sel = editorRef.state.selection;
        //     const allText = editorRef.state.doc.textBetween(1, editorRef.state.doc.content.size, '\n');
        //     const selText = editorRef.state.doc.textBetween(sel.from, sel.to, '\n');
        //     const contextBefore = allText.slice(Math.max(0, sel.from - 30), sel.from);
        //     const contextAfter = allText.slice(sel.to, sel.to + 30);
        //     let data = null;
        //     try {
        //       const res = await supabase.from('chapter_comments').insert({
        //         chapter_id: chapter.id,
        //         author_id: user?.id,
        //         from_pos: sel.from,
        //         to_pos: sel.to,
        //         body: val,
        //         selected_text: selText,
        //         exact: selText,
        //         prefix: contextBefore,
        //         suffix: contextAfter,
        //         pos_start: sel.from,
        //         pos_end: sel.to
        //       }).select('*').single();
        //       if (res.error) throw res.error;
        //       data = res.data;
        //     } catch (e) {
        //       const fallback = await supabase.from('chapter_comments').insert({
        //         chapter_id: chapter.id,
        //         author_id: user?.id,
        //         from_pos: sel.from,
        //         to_pos: sel.to,
        //         body: val,
        //         selected_text: selText
        //       }).select('*').single();
        //       if (fallback.error) throw fallback.error;
        //       data = fallback.data;
        //       dispatch(showToast({ message: 'Comment added without new anchor fields. Run DB migration to enable anchors.', type: 'warning' }));
        //     }
        //     setComments(prev => [data, ...prev]);
        //     setCommentModal({ show: false, oldText: '', defaultValue: '' });
        //     dispatch(showToast({ message: 'Comment added', type: 'success' }));
        //   } catch (e) {
        //     dispatch(showToast({ message: 'Failed to add comment', type: 'error' }));
        //   } finally {
        //     dispatch(setLoading(false));
        //   }
        // }}
        onConfirm={async (val) => {
          dispatch(setLoading({ isVisible: true, message: 'Adding comment...' }));          

          try {
            const data = await createComment({
              chapterId: chapter.id,
              userId: user?.id,
              selection: commentModal.selection,
              editor: editorRef,
              body: val,
            });

            if (!data) {
              dispatch(showToast({ message: 'Failed to add comment', type: 'error' }));
              return;
            }
            handleGoToComment(data);

            setComments((prev) => [data, ...prev]);

            setCommentModal({ show: false, oldText: '', defaultValue: '', selection: null });

            dispatch(showToast({ message: 'Comment added', type: 'success' }));
          } catch (e) {
            console.log(e)
            dispatch(showToast({ message: 'Failed to add comment', type: 'error' }));
          } finally {
            dispatch(setLoading(false));
          }
        }}
        defaultValue={commentModal.defaultValue}
        oldPreview={commentModal.oldText}
      />
      <TextInputModal
        show={forceModal.show}
        title="Propose Force Update"
        placeholder="Replacement text"
        confirmLabel="Propose"
        onCancel={() => setForceModal({ show: false, oldText: '', defaultValue: '' })}
        onConfirm={async (val) => {
          dispatch(setLoading({ isVisible: true, message: 'Proposing update...' }));
          try {
            const sel = editorRef.state.selection;
            const { data, error } = await supabase.from('chapter_edits').insert({
              chapter_id: chapter.id,
              author_id: user?.id,
              from_pos: sel.from,
              to_pos: sel.to,
              old_text: forceModal.oldText || '',
              new_text: val
            }).select('*').single();
            if (error) throw error;
            setEdits(prev => [data, ...prev]);
            setForceModal({ show: false, oldText: '', defaultValue: '' });
            dispatch(showToast({ message: 'Force update proposed', type: 'success' }));
          } catch (e) {
            dispatch(showToast({ message: 'Failed to propose update', type: 'error' }));
          } finally {
            dispatch(setLoading(false));
          }
        }}
        defaultValue={forceModal.defaultValue}
        oldPreview={forceModal.oldText}
      />

      <ConfirmModal
        show={confirm.show}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        confirmVariant={confirm.variant}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm({ ...confirm, show: false })}
      />

      <CommentViewModal
        compareModal={compareModal}
        setCompareModal={setCompareModal}
      />

      <ForceViewModal
        forceViewModal={forceViewModal}
        setForceViewModal={setForceViewModal}
      />
      </div>
    </Modal>
  );
};

export default ChapterEditorModal;
