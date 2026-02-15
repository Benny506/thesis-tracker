import { Alert, Modal, Button } from "react-bootstrap";
import { FaBolt, FaCommentDots } from "react-icons/fa";
import RichTextEditor from "../RichTextEditor";

export default function EditorModalBody({
    userRole,
    chapter,
    edits,
    handleAddComment,
    handleForceUpdate,
    comments,
    setCompareModal,
    handleGoToComment,
    handleMarkRead,
    handleEditorUpdate,
    handleImageUpload,
    setEditorRef,
    handleSave,
    content,
    handleRemoveActiveComment,
    activeCommentId={activeCommentId}
}) {
    return (
        <Modal.Body style={{ height: "calc(100vh - 120px)" }} className="p-0 bg-light">
            <div className="split-container container-fluid py-3 h-100">
                {userRole === 'student' && edits.length > 0 && (
                    <div className="mx-auto" style={{ maxWidth: '900px' }}>
                        <Alert variant="warning" className="mb-3">
                            Supervisor edits are pending. Accept them to continue editing.
                        </Alert>
                    </div>
                )}
                {userRole === 'student' && (chapter?.status === 'submitted' || chapter?.status === 'approved') && (
                    <div className="mx-auto" style={{ maxWidth: '900px' }}>
                        <Alert variant="info" className="mb-3">
                            {chapter?.status === 'submitted'
                                ? 'This chapter is read-only because it has been submitted for review.'
                                : 'This chapter is approved. Any edits you make will re-submit for review when saved.'}
                        </Alert>
                    </div>
                )}
                <div className="row g-3 h-100 flex-nowrap">

                    {/* ================= DESKTOP LEFT REVIEW COLUMN ================= */}
                    <div className="col-md-4 d-none d-md-flex flex-column h-100">

                        <div className="review-column d-flex flex-column h-100">

                            {/* SCROLL CONTAINER */}
                            <div className="flex-grow-1 overflow-auto pe-2">

                                {/* FORCE UPDATES PANEL */}
                                {/* <div className="panel-card mb-3">
                                    <div className="panel-header">
                                        <div className="panel-title">
                                            <FaBolt className="text-danger" />
                                            <span>Force Updates</span>
                                        </div>

                                        {userRole === "supervisor" && (
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={handleForceUpdate}
                                            >
                                                Propose
                                            </Button>
                                        )}
                                    </div>

                                    <div className="panel-body">
                                        {edits.length === 0 ? (
                                            <div className="panel-empty">
                                                No pending force updates
                                            </div>
                                        ) : (
                                            <div className="list-group list-condensed">
                                                {edits.map((ei) => (
                                                    <div className="list-group-item d-flex justify-content-between align-items-start" key={ei.id}>
                                                        <div style={{ maxWidth: '75%' }} className="me-3 small diff-text">
                                                            <div className="text-muted mb-1">{new Date(ei.created_at).toLocaleString()}</div>
                                                            <div className="mb-1">
                                                                <span className="old">
                                                                    {(ei.old_text || '(empty)').length > 80 ? (ei.old_text || '(empty)').slice(0, 80) + '…' : (ei.old_text || '(empty)')}
                                                                </span>
                                                                <span className="mx-1">→</span>
                                                                <span className="new">
                                                                    {(ei.new_text || '(empty)').length > 80 ? (ei.new_text || '(empty)').slice(0, 80) + '…' : (ei.new_text || '(empty)')}
                                                                </span>
                                                            </div>
                                                            <Button variant="link" size="sm" className="p-0" onClick={() => setForceViewModal({ show: true, oldText: ei.old_text || '', newText: ei.new_text || '' })}>View</Button>
                                                        </div>
                                                        <div className="d-flex flex-column align-items-end gap-1">
                                                            {userRole === 'student' && (
                                                                <Button variant="light" size="sm" onClick={() => handleGoToEdit(ei)}>
                                                                    Go to
                                                                </Button>
                                                            )}
                                                            {userRole === 'student' && (
                                                                <Button variant="success" size="sm" onClick={() => handleAcceptEdit(ei)}>
                                                                    Accept
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div> */}

                                {/* INLINE COMMENTS PANEL */}
                                <div className="panel-card">
                                    <div className="panel-header">
                                        <div className="panel-title">
                                            <FaCommentDots className="text-primary" />
                                            <span>Inline Comments</span>
                                        </div>

                                        {userRole === "supervisor" && (
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={handleAddComment}
                                            >
                                                Add
                                            </Button>
                                        )}
                                    </div>

                                    <div className="panel-body">
                                        {comments.length === 0 ? (
                                            <div className="panel-empty">No comments yet</div>
                                        ) : (
                                            <div className="list-group list-condensed">
                                                {comments.map((c) => {
                                                    const oldTxt = c.exact_match || c.selected_text || '';
                                                    const trimmed = (s) => (s && s.length > 80 ? s.slice(0, 80) + '…' : s || '');
                                                    const isActive = c.id === activeCommentId;

                                                    return (
                                                        <div
                                                            className={`list-group-item d-flex justify-content-between align-items-start ${isActive ? 'border-primary bg-light' : ''}`}
                                                            key={c.id}
                                                        >
                                                            <div className="me-3" style={{ maxWidth: '75%' }}>
                                                                <div className="small text-muted mb-1">{new Date(c.created_at).toLocaleString()}</div>
                                                                <div className="small text-muted">Text</div>
                                                                <div className="mb-1">{trimmed(oldTxt)}</div>
                                                                <div className="small text-muted">Comment</div>
                                                                <div className="mb-1">{trimmed(c.body)}</div>
                                                                {/* <div>
                                                                    <Button
                                                                        variant="link"
                                                                        size="sm"
                                                                        className="p-0"
                                                                        onClick={() =>
                                                                            handleGoToComment(c)
                                                                            // setCompareModal({
                                                                            //     show: true,
                                                                            //     oldText: oldTxt,
                                                                            //     newText: c.body || '',
                                                                            //     prefix: c.prefix || '',
                                                                            //     suffix: c.suffix || '',
                                                                            // })
                                                                        }
                                                                    >
                                                                        View
                                                                    </Button>
                                                                </div> */}
                                                            </div>

                                                            <div className="d-flex flex-column align-items-end gap-1">
                                                                {isActive ? (
                                                                    <Button variant="warning" size="sm" onClick={handleRemoveActiveComment}>
                                                                        Remove
                                                                    </Button>
                                                                ) : (
                                                                    <Button variant="light" size="sm" onClick={() => handleGoToComment(c)}>
                                                                        Go to
                                                                    </Button>
                                                                )}

                                                                {userRole === 'student' && !c.is_read && (
                                                                    <Button variant="outline-success" size="sm" onClick={() => handleMarkRead(c.id)}>
                                                                        Mark as read
                                                                    </Button>
                                                                )}
                                                                {userRole === 'student' && c.is_read && <span className="badge bg-success">Read</span>}
                                                                {userRole === 'supervisor' && (c.is_read ? <span className="badge bg-success">Read</span> : <span className="badge bg-secondary">Unread</span>)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* ================= DESKTOP RIGHT EDITOR COLUMN ================= */}
                    <div className="col-12 col-md-8 d-flex flex-column h-100">

                        <div className="editor-column bg-white shadow-sm rounded d-flex flex-column h-100 overflow-hidden">

                            {/* INDEPENDENT SCROLL AREA */}
                            <div className="flex-grow-1 overflow-auto">

                                <RichTextEditor
                                    content={content}
                                    onUpdate={handleEditorUpdate}
                                    editable={
                                        userRole === "student" &&
                                        chapter?.status !== "submitted" &&
                                        edits.length === 0
                                    }
                                    onImageUpload={handleImageUpload}
                                    highlightNewEdits={false}
                                    onEditorReady={setEditorRef}
                                    onRequestSave={(nextContent) => handleSave(null, false, nextContent)}
                                    handleRemoveActiveComment={handleRemoveActiveComment}
                                />

                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </Modal.Body>
    )
}
