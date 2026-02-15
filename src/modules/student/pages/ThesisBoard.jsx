import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { FaPlus, FaFileUpload, FaComment, FaCheck, FaClock, FaPaperPlane, FaPen, FaFileAlt } from 'react-icons/fa';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { showToast, setLoading, getUiState } from '../../../store/slices/uiSlice';
import { useLocation } from 'react-router-dom';
import ChapterEditorModal from '../../../components/editor/editorModal/ChapterEditorModal';

const ThesisBoard = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const location = useLocation();

  const loading = useSelector(state => getUiState(state)?.loading?.isVisible);
  const unreadByChapter = useSelector(state => state.unread.byChapter || {});
  const [chapters, setChapters] = useState([]);
  const [project, setProject] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Editor State
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const canAddChapter = chapters.length === 0 || chapters.every(c => c.status === 'approved');

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch(setLoading({ isVisible: true, message: 'Retrieving chapters' }));
        if (!user) return;

        // 1. Get Project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .single()
          .eq('student_id', user.id)
          .eq('status', "active")


        if (projectError) {
          console.log("projectError", projectError)
          throw projectError
        };

        setProject(projectData);

        if (projectData) {
          // 2. Get Chapters
          const { data: chapterData, error: chapterError } = await supabase
            .from('chapters')
            .select(`
                *,
                submissions (
                    id,
                    version,
                    created_at
                )
            `)
            .eq('project_id', projectData.id)
            .order('order_index', { ascending: true });

          if (chapterError) throw chapterError;
          setChapters(chapterData || []);

        }

      } catch (error) {
        console.error('Error fetching thesis board:', error);
        dispatch(showToast({ message: 'Failed to load thesis board', type: 'error' }));
      } finally {
        dispatch(setLoading({ isVisible: false }));
      }
    };

    fetchData();
  }, [user, refreshTrigger, dispatch]);

  // Add Chapter Form
  const formik = useFormik({
    initialValues: {
      title: '',
      description: ''
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Chapter title is required'),
      description: Yup.string()
    }),
    onSubmit: async (values, { resetForm }) => {
      if (!project) return;
      if (!canAddChapter) {
        dispatch(showToast({ message: 'You must get all existing chapters approved before adding a new one.', type: 'error' }));
        return;
      }

      try {
        dispatch(setLoading({ isVisible: true, message: 'Adding chapter...' }));
        const nextOrder = chapters.length > 0
          ? Math.max(...chapters.map(c => c.order_index)) + 1
          : 1;

        const { error } = await supabase.from('chapters').insert({
          project_id: project.id,
          title: values.title,
          content: values.description, // Using content field for description initially
          order_index: nextOrder,
          status: 'pending'
        });

        if (error) throw error;

        dispatch(showToast({ message: 'Chapter added successfully', type: 'success' }));
        setShowAddModal(false);
        resetForm();
        setRefreshTrigger(prev => prev + 1);

      } catch (err) {
        console.log(err)
        dispatch(showToast({ message: err.message, type: 'error' }));
      } finally {
        dispatch(setLoading({ isVisible: false }));
      }
    }
  });

  const openEditor = (chapter) => {
    setSelectedChapter(chapter);
    setShowEditor(true);
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setSelectedChapter(null);
  };

  const handleEditorSave = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const state = location.state;
    if (!state || !state.openChapterId || chapters.length === 0) return;
    const chapter = chapters.find((c) => c.id === state.openChapterId);
    if (chapter) {
      openEditor(chapter);
    }
  }, [location, chapters]);

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;

  if (!project) {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          You need to create a project in the Dashboard before managing chapters.
        </Alert>
      </Container>
    );
  }

  if (project.status === 'pending_approval') {
    return (
      <Container className="py-4">
        <Alert variant="info">
          Your project is pending approval. You can start adding chapters once approved.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div className="">
          <h2 className="fw-bold mb-1">My Thesis Board</h2>
          <p className="text-muted mb-0 text-truncate" style={{ maxWidth: 480 }}>{project.title}</p>
        </div>
        <div className="d-flex flex-column align-items-stretch align-items-md-end">
          <Button className="" variant="primary" onClick={() => setShowAddModal(true)} disabled={!canAddChapter}>
            <FaPlus className="me-2" /> Add Chapter
          </Button>
          {!canAddChapter && (
            <small className="text-muted mt-1 text-end">Chapters can be added only after all are approved</small>
          )}
        </div>
      </div>

      <Row className="g-3">
        {chapters.length === 0 ? (
          <Col xs={12}>
            <div className="text-center py-5 bg-light rounded border">
              <h4 className="text-muted">No chapters yet</h4>
              <p>Start by adding your first chapter (e.g., "Introduction")</p>
              <Button className="w-100 w-md-auto" variant="outline-primary" onClick={() => setShowAddModal(true)}>
                Create First Chapter
              </Button>
            </div>
          </Col>
        ) : (
          chapters.map((chapter) => (
            <Col lg={12} key={chapter.id}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="">
                    <div className="mb-4 w-100 w-md-auto">
                      <div className="d-flex align-items-center mb-2 flex-wrap gap-2">
                        <Badge bg="light" text="dark" className="me-2 border">
                          #{chapter.order_index}
                        </Badge>
                        <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-truncate" style={{ maxWidth: 360 }}>
                          <span className="text-truncate">{chapter.title}</span>
                        </h5>
                      </div>
                      <p className="text-muted my-3 small" style={{}}>{chapter.content || 'No description'}</p>
                    </div>

                    <div className='d-flex align-items-center justify-content-between flex-wrap gap-3'>
                      <div className="d-flex gap-2 flex-wrap">
                        <Badge bg={getStatusColor(chapter.status)} pill>
                          {chapter.status.replace('_', ' ')}
                        </Badge>
                        {chapter.has_pending_force_updates && (
                          <Badge bg="warning" text="dark" pill>
                            Supervisor edits pending
                          </Badge>
                        )}
                        {unreadByChapter[chapter.id]?.count > 0 && (
                          <Badge bg="info" text="dark" pill>
                            {unreadByChapter[chapter.id].count} unread comment
                            {unreadByChapter[chapter.id].count > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>

                      <div style={{}} className="d-flex justify-content-end gap-2">
                        <Button className="flex-grow-1 flex-md-grow-0" variant="primary" size="sm" onClick={() => openEditor(chapter)}>
                          <FaPen className="me-1" /> {chapter.status === 'submitted' || chapter.status === 'approved' ? 'View' : 'Write & Edit'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        )}
      </Row>

      {/* Editor Modal */}
      <ChapterEditorModal
        show={showEditor}
        onHide={handleEditorClose}
        chapter={selectedChapter}
        onSave={handleEditorSave}
      />

      {/* Add Chapter Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Chapter</Modal.Title>
        </Modal.Header>
        <Form onSubmit={formik.handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Chapter Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Literature Review"
                {...formik.getFieldProps('title')}
                isInvalid={formik.touched.title && formik.errors.title}
              />
              <Form.Control.Feedback type="invalid">{formik.errors.title}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description / Objectives</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                {...formik.getFieldProps('description')}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? 'Adding...' : 'Add Chapter'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </Container>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'approved': return 'success';
    case 'submitted': return 'info';
    case 'in_progress': return 'primary';
    case 'pending': return 'secondary';
    default: return 'secondary';
  }
};

export default ThesisBoard;
