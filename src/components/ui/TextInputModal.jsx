import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const TextInputModal = ({ show, title, placeholder = '', confirmLabel = 'Confirm', onCancel, onConfirm, defaultValue = '', oldPreview = null, multiline = true }) => {
  const [value, setValue] = useState(defaultValue || '');

  useEffect(() => {
    if (show) setValue(defaultValue || '');
  }, [show, defaultValue]);

  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {oldPreview !== null && (
          <div className="mb-3">
            <div className="small text-muted mb-1">Current Selection</div>
            <div className="p-2 border rounded bg-light" style={{ whiteSpace: 'pre-wrap' }}>
              {oldPreview || '(empty)'}
            </div>
          </div>
        )}
        <Form.Group>
          <Form.Label className="small fw-bold">{placeholder || 'Enter text'}</Form.Label>
          {multiline ? (
            <Form.Control as="textarea" rows={5} value={value} onChange={(e) => setValue(e.target.value)} />
          ) : (
            <Form.Control type="text" value={value} onChange={(e) => setValue(e.target.value)} />
          )}
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={() => onConfirm(value)} disabled={!value.trim()}>{confirmLabel}</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TextInputModal;

