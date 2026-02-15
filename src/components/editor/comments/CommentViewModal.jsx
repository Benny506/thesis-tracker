import { Modal, Button } from "react-bootstrap";

export default function CommentViewModal({
    compareModal,
    setCompareModal
}) {
    return (
        <Modal
            show={compareModal.show}
            onHide={() =>
                setCompareModal({
                    show: false,
                    oldText: '',
                    newText: '',
                    prefix: '',
                    suffix: '',
                })
            }
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title>Comment Context</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="mb-2">
                    <div className="small text-muted">Context</div>
                    <div className="border rounded p-2" style={{ whiteSpace: 'pre-wrap' }}>
                        {compareModal.prefix || ''}
                        <mark>{compareModal.oldText}</mark>
                        {compareModal.suffix || ''}
                    </div>
                </div>
                <div className="mb-2">
                    <div className="small text-muted">Text</div>
                    <div className="border rounded p-2" style={{ whiteSpace: 'pre-wrap' }}>{compareModal.oldText}</div>
                </div>
                <div>
                    <div className="small text-muted">Comment</div>
                    <div className="border rounded p-2" style={{ whiteSpace: 'pre-wrap' }}>{compareModal.newText || 'No comment'}</div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button
                    variant="secondary"
                    onClick={() =>
                        setCompareModal({
                            show: false,
                            oldText: '',
                            newText: '',
                            prefix: '',
                            suffix: '',
                        })
                    }
                >
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    )
}
