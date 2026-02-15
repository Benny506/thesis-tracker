import { Button, Modal } from "react-bootstrap";

export default function ForceViewModal({ 
    forceViewModal,
    setForceViewModal
}) {
    return (
        <Modal show={forceViewModal.show} onHide={() => setForceViewModal({ show: false, oldText: '', newText: '' })} centered>
            <Modal.Header closeButton>
                <Modal.Title>Force Update Details</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="mb-2">
                    <div className="small text-muted">Old Text</div>
                    <div className="border rounded p-2" style={{ whiteSpace: 'pre-wrap' }}>{forceViewModal.oldText || '(empty)'}</div>
                </div>
                <div>
                    <div className="small text-muted">New Text</div>
                    <div className="border rounded p-2" style={{ whiteSpace: 'pre-wrap' }}>{forceViewModal.newText || '(empty)'}</div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setForceViewModal({ show: false, oldText: '', newText: '' })}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    )
}