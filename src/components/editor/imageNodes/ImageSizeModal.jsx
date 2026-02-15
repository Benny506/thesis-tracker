import { Form, Modal, Button } from "react-bootstrap";

export default function ImageSizeModal({ 
    imageModal,
    setImageModal,
    applyImageSize
}) {
    return (
        <Modal show={imageModal.show} onHide={() => setImageModal({ show: false, pos: null, widthPct: 50, src: '' })} centered>
            <Modal.Header closeButton>
                <Modal.Title>Image Size</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {!!imageModal.src && (
                    <div className="border rounded p-2 mb-3 d-flex justify-content-center">
                        <img
                            src={imageModal.src}
                            alt="Preview"
                            style={{ width: `${imageModal.widthPct}%`, maxWidth: '100%', height: 'auto', display: 'block' }}
                        />
                    </div>
                )}
                <Form.Label>Width: {imageModal.widthPct}%</Form.Label>
                <Form.Range min={10} max={100} step={1} value={imageModal.widthPct} onChange={(e) => setImageModal(m => ({ ...m, widthPct: parseInt(e.target.value, 10) }))} />
                <div className="d-flex gap-2 mt-2">
                    {[25, 50, 75, 100].map(v => (
                        <Button key={v} variant="outline-secondary" size="sm" onClick={() => setImageModal(m => ({ ...m, widthPct: v }))}>{v}%</Button>
                    ))}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setImageModal({ show: false, pos: null, widthPct: 50, src: '' })}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={applyImageSize}>
                    Save
                </Button>
            </Modal.Footer>
        </Modal>
    )
}