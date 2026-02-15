import { Offcanvas, Button } from "react-bootstrap";
import { FaCommentDots, FaBolt } from "react-icons/fa";

export default function ReviewOffCanvas({
    showReview,
    setShowReview,
    userRole,
    edits,
    handleAcceptEdit,
    handleForceUpdate,
    handleAddComment,
    handleGoToComment,
    handleGoToEdit,
    handleMarkRead,
    comments,
    handleRemoveActiveComment,
    activeCommentId
}) {
    return (
        <Offcanvas show={showReview} onHide={() => setShowReview(false)} placement="start" style={{ zIndex: 2001 }}>
            <Offcanvas.Header closeButton>
                <Offcanvas.Title>Review</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
                {/* <div className="panel-card mb-3">
                    <div className="panel-header">
                        <div className="panel-title">
                            <FaBolt className="text-danger" />
                            <span>Force Updates</span>
                        </div>
                        {userRole === 'supervisor' && (
                            <Button variant="outline-danger" size="sm" onClick={handleForceUpdate}>Propose</Button>
                        )}
                    </div>
                    <div className="panel-body">
                        {edits.length === 0 ? (
                            <div className="panel-empty">No pending force updates</div>
                        ) : (
                            <div className="list-group list-condensed">
                                {edits.map(ei => (
                                    <div className="list-group-item d-flex justify-content-between align-items-start" key={ei.id}>
                                        <div className="me-3 small diff-text">
                                            <div className="text-muted mb-1">{new Date(ei.created_at).toLocaleString()}</div>
                                            <div>
                                                <span className="old">{(ei.old_text || '(empty)').length > 80 ? (ei.old_text || '(empty)').slice(0, 80) + '…' : (ei.old_text || '(empty)')}</span>
                                                <span className="mx-1">→</span>
                                                <span className="new">{(ei.new_text || '(empty)').length > 80 ? (ei.new_text || '(empty)').slice(0, 80) + '…' : (ei.new_text || '(empty)')}</span>
                                            </div>
                                            <Button variant="link" size="sm" className="p-0" onClick={() => setForceViewModal({ show: true, oldText: ei.old_text || '', newText: ei.new_text || '' })}>View</Button>
                                        </div>
                                        <div className="d-flex flex-column align-items-end gap-1">
                                            {userRole === 'student' && (
                                                <Button variant="light" size="sm" onClick={() => { handleGoToEdit(ei); setShowReview(false); }}>Go to</Button>
                                            )}
                                            {userRole === 'student' && (
                                                <Button variant="success" size="sm" onClick={() => { handleAcceptEdit(ei); setShowReview(false); }}>Accept</Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div> */}
                <div className="panel-card">
                    <div className="panel-header">
                        <div className="panel-title">
                            <FaCommentDots className="text-primary" />
                            <span>Inline Comments</span>
                        </div>
                        {userRole === 'supervisor' && (
                            <Button variant="outline-primary" size="sm" onClick={handleAddComment}>Add</Button>
                        )}
                    </div>
                    <div className="panel-body">
                        {comments.length === 0 ? (
                            <div className="panel-empty">No comments yet</div>
                        ) : (
                            <div className="list-group list-condensed">
                                {comments.map((c) => {
                                    const oldTxt = c.exact || c.selected_text || '';
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
                                                <div>
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        className="p-0"
                                                        onClick={() =>
                                                            setCompareModal({
                                                                show: true,
                                                                oldText: oldTxt,
                                                                newText: c.body || '',
                                                            })
                                                        }
                                                    >
                                                        View
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="d-flex flex-column align-items-end gap-1">
                                                {isActive ? (
                                                    <Button variant="warning" size="sm" onClick={handleRemoveActiveComment}>
                                                        Remove
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="light"
                                                        size="sm"
                                                        onClick={() => {
                                                            handleGoToComment(c);
                                                            setShowReview(false);
                                                        }}
                                                    >
                                                        Go to
                                                    </Button>
                                                )}

                                                {userRole === 'student' && !c.is_read && (
                                                    <Button variant="outline-success" size="sm" onClick={() => handleMarkRead(c.id)}>
                                                        Mark as read
                                                    </Button>
                                                )}
                                                {userRole === 'student' && c.is_read && <span className="badge bg-success">Read</span>}
                                                {userRole === 'supervisor' &&
                                                    (c.is_read ? <span className="badge bg-success">Read</span> : <span className="badge bg-secondary">Unread</span>)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </Offcanvas.Body>
        </Offcanvas>
    )
}