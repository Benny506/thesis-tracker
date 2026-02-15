import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import './ConfirmModal.css';

const ConfirmModal = ({ show, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, confirmVariant = 'danger' }) => {
  return (
    <Modal show={show} onHide={onCancel} centered backdropClassName="confirm-backdrop">
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div>{message}</div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmModal;
