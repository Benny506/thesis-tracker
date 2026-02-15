import { Modal, Button, Badge, Spinner } from "react-bootstrap";
import { FaCheck, FaCommentDots, FaFileWord, FaBan, FaSave, FaBolt } from "react-icons/fa";

export default function EditorModalHeader({
    chapter,
    autoSaving,
    lastSaved,
    userRole,
    handleFileUpload,
    openConfirm,
    handleSave,
    setShowActions,
    setShowReview,
    handleCloseAttempt,
    saving,
    importing,
    edits,
}) {
    return (
        <Modal.Header className="bg-light border-bottom py-2">
            <div className="w-100">

                {/* TOP ROW */}
                <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">

                    {/* LEFT SECTION */}
                    <div className="d-flex align-items-start gap-2 flex-grow-1 min-w-0">

                        <Button
                            variant="close"
                            onClick={handleCloseAttempt}
                            aria-label="Close"
                            className="mt-1"
                        />

                        <div className="flex-grow-1 min-w-0">

                            {/* Title + Status */}
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <h5
                                    className="mb-0 fw-bold text-truncate"
                                    style={{ maxWidth: "100%" }}
                                >
                                    {chapter?.title || "Edit Chapter"}
                                </h5>

                                {chapter?.status && (
                                    <Badge
                                        bg={
                                            chapter.status === "approved"
                                                ? "success"
                                                : chapter.status === "submitted"
                                                    ? "warning"
                                                    : "secondary"
                                        }
                                    >
                                        {chapter.status.replace("_", " ")}
                                    </Badge>
                                )}
                            </div>

                            {/* Save Status */}
                            <div className="mt-1">
                                {autoSaving && (
                                    <small className="text-muted fst-italic">
                                        Saving...
                                    </small>
                                )}

                                {!autoSaving && lastSaved && (
                                    <small className="text-muted">
                                        Last saved:{" "}
                                        {new Date(lastSaved).toLocaleTimeString()}
                                    </small>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* DESKTOP ACTIONS */}
                    <div className="d-none d-md-flex align-items-center gap-2 flex-wrap">

                        {/* Word Import */}
                        {userRole === "student" && (
                            <div className="position-relative">
                                <input
                                    type="file"
                                    accept=".docx"
                                    id="word-upload"
                                    className="d-none"
                                    onChange={handleFileUpload}
                                    disabled={
                                        importing ||
                                        chapter?.status === "submitted" ||
                                        chapter?.status === "approved"
                                    }
                                />

                                <label
                                    htmlFor="word-upload"
                                    className={`btn btn-outline-secondary btn-sm ${importing ||
                                        chapter?.status === "submitted" ||
                                        chapter?.status === "approved"
                                        ? "disabled"
                                        : ""
                                        }`}
                                >
                                    {importing ? (
                                        <Spinner size="sm" animation="border" />
                                    ) : (
                                        <>
                                            <FaFileWord className="me-1" />
                                            Import
                                        </>
                                    )}
                                </label>
                            </div>
                        )}

                        {/* Supervisor Actions */}
                        {userRole === "supervisor" && chapter?.status === 'submitted' && (
                            <>
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => openConfirm("approve")}
                                    disabled={saving}
                                >
                                    <FaCheck className="me-1" />
                                    Approve
                                </Button>

                                <Button
                                    variant="warning"
                                    size="sm"
                                    onClick={() => openConfirm("changes")}
                                    disabled={saving}
                                >
                                    <FaBan className="me-1" />
                                    Request Changes
                                </Button>
                            </>
                        )}

                        {/* Student Submit */}
                        {userRole === "student" &&
                            chapter?.status !== "approved" &&
                            chapter?.status !== "submitted" && (
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => openConfirm("submit")}
                                    disabled={saving}
                                >
                                    <FaCheck className="me-1" />
                                    Submit
                                </Button>
                            )}

                        {/* Save Button */}
                        {
                            userRole === 'student'
                            &&
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSave()}
                                disabled={
                                    saving ||
                                    (userRole === "student" &&
                                        (chapter?.status === "submitted" || edits.length > 0))
                                }
                            >
                                {saving ? (
                                    <Spinner size="sm" animation="border" />
                                ) : (
                                    <>
                                        <FaSave className="me-1" />
                                        {userRole === "student"
                                            ? chapter?.status === "submitted"
                                                ? "Read Only"
                                                : chapter?.status === "approved"
                                                    ? "Save & Resubmit"
                                                    : "Save Draft"
                                            : "Save Changes"}
                                    </>
                                )}
                            </Button>
                        }
                    </div>
                </div>

                {/* MOBILE ACTION BAR */}
                <div className="d-flex d-md-none justify-content-end gap-2 mt-2">

                    <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => setShowReview(true)}
                    >
                        <FaBolt className="me-1" />
                        Review
                    </Button>

                    <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => setShowActions(true)}
                    >
                        <FaCommentDots className="me-1" />
                        Actions
                    </Button>
                </div>

            </div>
        </Modal.Header>
    )
}