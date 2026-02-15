import { Offcanvas, Button } from "react-bootstrap";

export default function ActionsOffCanvas({
    showActions,
    setShowActions,
    userRole,
    openConfirm,
    handleFileUpload,
    chapter,
}) {
    return (
        <Offcanvas show={showActions} onHide={() => setShowActions(false)} placement="end" style={{ zIndex: 2001 }}>
            <Offcanvas.Header closeButton>
                <Offcanvas.Title>Actions</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
                {userRole === 'student' && chapter?.status !== 'approved' && chapter?.status !== 'submitted' && (
                    <Button variant="success" className="w-100 mb-2" onClick={() => { setShowActions(false); openConfirm('submit'); }}>
                        Submit for Review
                    </Button>
                )}
                {userRole === 'supervisor' && (
                    <>
                        <Button variant="success" className="w-100 mb-2" onClick={() => { setShowActions(false); openConfirm('approve'); }}>
                            Approve
                        </Button>
                        <Button variant="warning" className="w-100 mb-2" onClick={() => { setShowActions(false); openConfirm('changes'); }}>
                            Request Changes
                        </Button>
                    </>
                )}
                {userRole === 'student' && (
                    <div className="d-grid">
                        <label htmlFor="word-upload-offcanvas" className="btn btn-outline-secondary">
                            Import from Word
                        </label>
                        <input
                            type="file"
                            id="word-upload-offcanvas"
                            className="d-none"
                            accept=".docx"
                            onChange={(e) => { setShowActions(false); handleFileUpload(e); }}
                        />
                    </div>
                )}
            </Offcanvas.Body>
        </Offcanvas>
    )
}