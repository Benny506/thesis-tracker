import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { supabase } from '../../../lib/supabase';
import { FaBook, FaCheck, FaTimes, FaComment, FaClock, FaEye } from 'react-icons/fa';
import ChapterEditorModal from '../../../components/editor/editorModal/ChapterEditorModal';

const SupervisorThesisViewer = ({ show, onHide, project }) => {
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [showEditor, setShowEditor] = useState(false);

    useEffect(() => {
        if (project && show) {
            fetchChapters();
        }
    }, [project, show]);

    const fetchChapters = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('chapters')
                .select('*')
                .eq('project_id', project.id)
                .order('order_index', { ascending: true });

            if (error) throw error;
            setChapters(data || []);
        } catch (error) {
            console.error('Error fetching chapters:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChapterClick = (chapter) => {
        setSelectedChapter(chapter);
        setShowEditor(true);
    };

    const handleEditorClose = () => {
        setShowEditor(false);
        setSelectedChapter(null);
        fetchChapters(); // Refresh status if changed
    };

    return (
        <>
            <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">
                        Thesis Review: {project?.title}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-light">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" />
                        </div>
                    ) : (
                        <div className="container-fluid">
                            <Row>
                                {chapters.length === 0 ? (
                                    <Col className="text-center py-5">
                                        <div className="text-muted mb-3">
                                            <FaBook size={48} />
                                        </div>
                                        <h5>No chapters submitted yet</h5>
                                        <p className="text-muted">The student hasn't started writing yet.</p>
                                    </Col>
                                ) : (
                                    chapters.map((chapter) => (
                                        <Col md={6} lg={4} key={chapter.id} className="mb-4">
                                            <Card className="h-100 shadow-sm border-0 hover-card">
                                                <Card.Body>
                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                        <h5 className="fw-bold mb-0">{chapter.title}</h5>
                                                        <Badge bg={
                                                            chapter.status === 'approved' ? 'success' :
                                                            chapter.status === 'submitted' ? 'warning' :
                                                            chapter.status === 'changes_requested' ? 'danger' : 'secondary'
                                                        }>
                                                            {chapter.status.replace('_', ' ').toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="mb-3">
                                                        <small className="text-muted d-block mb-1">
                                                            <FaClock className="me-2" />
                                                            Last edited: {new Date(chapter.last_edited_at).toLocaleDateString()}
                                                        </small>
                                                    </div>

                                                    <Button 
                                                        variant="primary" 
                                                        className="w-100"
                                                        onClick={() => handleChapterClick(chapter)}
                                                    >
                                                        <FaEye className="me-2" /> Review Chapter
                                                    </Button>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))
                                )}
                            </Row>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Close</Button>
                </Modal.Footer>
            </Modal>

            <ChapterEditorModal 
                show={showEditor}
                onHide={handleEditorClose}
                chapter={selectedChapter}
                userRole="supervisor"
                onSave={handleEditorClose}
            />
        </>
    );
};

export default SupervisorThesisViewer;
