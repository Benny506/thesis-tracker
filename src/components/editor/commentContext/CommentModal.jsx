import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const CommentModal = ({ show, onHide, payload }) => {
  if (!payload) {
    return null;
  }

  const { comment, found } = payload;
  const prefix = comment.prefix || '';
  const exact = comment.exact_match || comment.selected_text || '';
  const suffix = comment.suffix || '';

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Comment Context</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-2">
          <div className="small text-muted">Context</div>
          <div className="border rounded p-2" style={{ whiteSpace: 'pre-wrap' }}>
            {prefix}
            <mark>{exact}</mark>
            {suffix}
          </div>
        </div>
        <div className="mb-2">
          <div className="small text-muted">Comment</div>
          <div className="border rounded p-2" style={{ whiteSpace: 'pre-wrap' }}>
            {comment.body || ''}
          </div>
        </div>
        <div className="mb-2 small text-muted">
          {/* <div>Author: {comment.author_id}</div> */}
          <div>Created: {comment.created_at ? new Date(comment.created_at).toLocaleString() : '—'}</div>
          {!found && (
            <div className="text-warning mt-1">
              The text may have changed; exact position could not be highlighted.
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CommentModal;

