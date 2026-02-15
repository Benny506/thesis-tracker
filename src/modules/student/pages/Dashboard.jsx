import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, ProgressBar, Form, Modal, Table, Badge } from 'react-bootstrap';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { FaBook, FaComments, FaClock, FaCheckCircle, FaExclamationCircle, FaPlus, FaInfoCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../../../store/slices/uiSlice';
import ProjectDetailsModal from '../../../components/projects/ProjectDetailsModal';

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [supervisors, setSupervisors] = useState([]);

  // Modal State
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Deadlines State
  const [nextDeadline, setNextDeadline] = useState(null);

  const [data, setData] = useState({
    projects: [],
    activeProject: null,
    activeChapter: null,
    chapters: [],
    recentComments: [],
    unreadCommentChapters: [],
    stats: {
      totalChapters: 0,
      completedChapters: 0,
      unreadCount: 0
    }
  });

  const totalUnreadComments = useSelector((state) => state.unread.totalComments);
  const unreadByChapter = useSelector((state) => state.unread.byChapter || {});

  const fetchDashboardData = async () => {
    try {
      if (!user) return;
      setLoading(true);

      // 1. Fetch All Projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
           *,
           supervisor:supervisor_id (
             id,
             full_name
           )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      if (!projectsData || projectsData.length === 0) {
        setData(prev => ({
          ...prev,
          projects: [],
          activeProject: null,
          activeChapter: null,
          chapters: [],
          recentComments: [],
          unreadCommentChapters: [],
        }));

        setNextDeadline(null);
        return;
      }

      // Determine active project vs pending vs others
      const activeProject =
        projectsData.find(p => p.status === 'active') ||
        projectsData.find(p => p.status === 'completed');

      // If we have an active/selected project, fetch its chapters
      let chapters = [];
      let comments = [];
      let completedChapters = 0;
      let nearestDeadline = null;

      if (activeProject) {
        // 2. Fetch Chapters
        const { data: ch, error: chError } = await supabase
          .from('chapters')
          .select('*')
          .eq('project_id', activeProject.id)
          .order('order_index', { ascending: true });

        if (chError) throw chError;
        chapters = ch;
        completedChapters = chapters.filter(c => c.status === 'approved').length;

        // 3. Fetch Recent Comments
        const { data: cm, error: cmError } = await supabase
          .from('comments')
          .select(`
              *,
              submissions!inner (
                chapter_id,
                chapters (title)
              ),
              profiles (full_name)
            `)
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(5);

        if (cmError) console.warn('Error fetching comments:', cmError);
        comments = cm || [];

        // 4. Fetch Nearest Deadline
        const { data: deadlines, error: deadlineError } = await supabase
          .from('project_deadlines')
          .select('*')
          .eq('project_id', activeProject.id)
          .eq('is_completed', false)
          .order('due_date', { ascending: true })
          .limit(1);

        if (!deadlineError && deadlines?.length > 0) {
          nearestDeadline = deadlines[0];
        }
      }

      const activeChapter = chapters.find(c => c.status !== 'approved') || chapters[chapters.length - 1];

      setData({
        projects: projectsData,
        activeProject,
        activeChapter,
        chapters,
        recentComments: comments,
        stats: {
          totalChapters: chapters.length,
          completedChapters,
          unreadCount: 0
        }
      });
      setNextDeadline(nearestDeadline);

    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markDeadlineComplete = async () => {
    if (!nextDeadline) return;
    try {
      const { error } = await supabase
        .from('project_deadlines')
        .update({ is_completed: true })
        .eq('id', nextDeadline.id);

      if (error) throw error;

      dispatch(showToast({ message: 'Milestone marked as completed!', type: 'success' }));
      fetchDashboardData(); // Refresh to get next deadline
    } catch (err) {
      dispatch(showToast({ message: err.message, type: 'error' }));
    }
  };

  const fetchSupervisors = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'supervisor');

    if (!error && data) {
      setSupervisors(data);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchSupervisors();
  }, [user]);

  // Project Creation Form
  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      supervisor_id: ''
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Project title is required'),
      description: Yup.string().required('Description is required'),
      supervisor_id: Yup.string().required('Please select a supervisor')
    }),
    onSubmit: async (values) => {
      try {
        const { error } = await supabase.from('projects').insert({
          student_id: user.id,
          title: values.title,
          description: values.description,
          supervisor_id: values.supervisor_id,
          status: 'pending_approval'
        });

        if (error) throw error;

        dispatch(showToast({ message: 'Project created! Waiting for supervisor approval.', type: 'success' }));
        setShowCreateModal(false);
        fetchDashboardData();

      } catch (err) {
        dispatch(showToast({ message: err.message || 'Failed to create project', type: 'error' }));
      }
    }
  });


  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">Error loading dashboard: {error}</Alert>
      </Container>
    );
  }

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setShowDetailsModal(true);
  };

  const unreadChapters = data.chapters && data.chapters.length > 0
    ? data.chapters.reduce((acc, chapter) => {
        const entry = unreadByChapter[chapter.id];
        if (!entry || !entry.count) return acc;
        acc.push({
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          count: entry.count,
          latest: entry.latest,
        });
        return acc;
      }, [])
    : [];

  // State: No Project or Only Proposals (No Active Project)
  if (!data.activeProject) {
    const pendingProjects = data.projects.filter(p => p.status === 'pending_approval');
    const rejectedProjects = data.projects.filter(p => p.status === 'rejected');
    const staleProjects = data.projects.filter(p => p.status === 'stale');

    return (
      <Container fluid className="p-4">
        <Row className="mb-4">
          <Col>
            <h2 className="fw-bold text-primary">Project Proposals</h2>
            <p className="text-muted">Manage your thesis proposals. You can submit multiple ideas, but only one can be active at a time.</p>
          </Col>
          <Col xs="auto">
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <i className="bi bi-plus-lg me-2"></i>New Proposal
            </Button>
          </Col>
        </Row>

        {/* Pending Proposals */}
        {pendingProjects.length > 0 && (
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-warning bg-opacity-10 py-3">
              <h5 className="mb-0 text-warning fw-bold"><FaClock className="me-2" />Pending Approval</h5>
            </Card.Header>
            <Card.Body>
              <Row xs={1} md={2} lg={3} className="g-4">
                {pendingProjects.map(project => (
                  <Col key={project.id}>
                    <Card
                      className="h-100 border-warning cursor-pointer hover-shadow"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleProjectClick(project)}
                    >
                      <Card.Body>
                        <Card.Title>{project.title}</Card.Title>
                        <Card.Text className="text-muted small" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</Card.Text>
                        <div className="d-flex justify-content-between align-items-center mt-3">
                          <span className="badge bg-warning text-dark">Pending</span>
                          <small className="text-muted">{new Date(project.created_at).toLocaleDateString()}</small>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Stale Proposals */}
        {staleProjects.length > 0 && (
          <Card className="border-0 shadow-sm mb-4 opacity-75">
            <Card.Header className="bg-light py-3">
              <h5 className="mb-0 text-secondary fw-bold">Stale Proposals</h5>
              <small className="text-muted">These were set to stale because another project was approved.</small>
            </Card.Header>
            <Card.Body>
              <Row xs={1} md={2} lg={3} className="g-4">
                {staleProjects.map(project => (
                  <Col key={project.id}>
                    <Card
                      className="h-100 bg-light border-0 cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleProjectClick(project)}
                    >
                      <Card.Body>
                        <Card.Title className="text-muted">{project.title}</Card.Title>
                        <Card.Text className="text-muted small" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</Card.Text>
                        <span className="badge bg-secondary">Stale</span>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Rejected Proposals */}
        {rejectedProjects.length > 0 && (
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-danger bg-opacity-10 py-3">
              <h5 className="mb-0 text-danger fw-bold">Rejected Proposals</h5>
            </Card.Header>
            <Card.Body>
              <Row xs={1} md={2} lg={3} className="g-4">
                {rejectedProjects.map(project => (
                  <Col key={project.id}>
                    <Card
                      className="h-100 border-danger cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleProjectClick(project)}
                    >
                      <Card.Body>
                        <Card.Title>{project.title}</Card.Title>
                        <Card.Text className="text-muted small" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</Card.Text>

                        <div className="alert alert-danger mt-3 mb-0 py-2 small">
                          <strong>Reason: </strong> {project.rejection_reason || 'No reason provided'}
                        </div>
                      </Card.Body>
                      <Card.Footer className="bg-white border-top-0">
                        <span className="badge bg-danger">Rejected</span>
                      </Card.Footer>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        )}

        {data.projects.length === 0 && (
          <div className="text-center py-5">
            <div className="display-1 text-muted mb-3"><FaBook /></div>
            <h4>No Proposals Yet</h4>
            <p className="text-muted">Submit your first thesis proposal to get started.</p>
            <Button variant="primary" size="lg" onClick={() => setShowCreateModal(true)}>
              Create Proposal
            </Button>
          </div>
        )}

        {/* Create Proposal Modal */}
        <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Submit New Proposal</Modal.Title>
          </Modal.Header>
          <Form onSubmit={formik.handleSubmit}>
            <Modal.Body>
              <Alert variant="info">
                You can submit multiple proposals. Once one is approved, the others will become stale.
              </Alert>
              <Form.Group className="mb-3">
                <Form.Label>Project Title</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter project title"
                  {...formik.getFieldProps('title')}
                  isInvalid={formik.touched.title && formik.errors.title}
                />
                <Form.Control.Feedback type="invalid">{formik.errors.title}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Brief abstract of your research..."
                  {...formik.getFieldProps('description')}
                  isInvalid={formik.touched.description && formik.errors.description}
                />
                <Form.Control.Feedback type="invalid">{formik.errors.description}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Select Supervisor</Form.Label>
                <Form.Select
                  {...formik.getFieldProps('supervisor_id')}
                  isInvalid={formik.touched.supervisor_id && formik.errors.supervisor_id}
                >
                  <option value="">Choose a supervisor...</option>
                  {supervisors.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.full_name}</option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{formik.errors.supervisor_id}</Form.Control.Feedback>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={formik.isSubmitting}>
                {formik.isSubmitting ? 'Submitting...' : 'Submit Proposal'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Project Details Modal */}
        <ProjectDetailsModal
          show={showDetailsModal}
          onHide={() => setShowDetailsModal(false)}
          project={selectedProject}
          userRole="student"
          onUpdate={() => {
            fetchDashboardData();
            setShowDetailsModal(false);
          }}
        />
      </Container>
    );
  }

  // State: Active Dashboard (Existing Logic)
  const progress = data.stats.totalChapters > 0
    ? (data.stats.completedChapters / data.stats.totalChapters) * 100
    : 0;

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold text-dark">Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}!</h2>
        <p className="text-muted">{data.activeProject?.title}</p>
      </div>

      {/* Stats Row */}
      <Row className="g-4 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                <FaBook className="text-primary" size={24} />
              </div>
              <div>
                <h6 className="text-muted mb-0">Current Chapter</h6>
                <h5 className="mb-0 fw-bold">{data.activeChapter?.title || 'None'}</h5>
                <span className={`badge mt-1 bg-${getStatusColor(data.activeChapter?.status)}`}>
                  {data.activeChapter?.status || 'N/A'}
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3">
                <FaCheckCircle className="text-success" size={24} />
              </div>
              <div>
                <h6 className="text-muted mb-0">Overall Progress</h6>
                <h5 className="mb-0 fw-bold">{Math.round(progress)}%</h5>
                <ProgressBar now={progress} variant="success" className="mt-2" style={{ height: '6px', width: '100px' }} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="rounded-circle bg-warning bg-opacity-10 p-3 me-3">
                <FaComments className="text-warning" size={24} />
              </div>
              <div>
                <h6 className="text-muted mb-0">Unresolved Feedback</h6>
                <h5 className="mb-0 fw-bold">{totalUnreadComments}</h5>
                <small className="text-muted">Requires attention</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        {/* Recent Activity / Feedback */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white border-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Unread Comments</h5>
              </div>
            </Card.Header>
            <Card.Body className="pt-0">
              {unreadChapters.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted mb-0">No unread comments. You are all caught up.</p>
                </div>
              ) : (
                <>
                  {/* Desktop / Tablet Table */}
                  <div className="d-none d-md-block">
                    <Table hover responsive size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>Chapter</th>
                          <th>Latest Comment</th>
                          <th>Unread Count</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unreadChapters.map((row) => (
                          <tr key={row.chapterId}>
                            <td>{row.chapterTitle}</td>
                            <td>{new Date(row.latest).toLocaleDateString()}</td>
                            <td>
                              <span className="badge bg-info text-dark">
                                {row.count}
                              </span>
                            </td>
                            <td className="text-end">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() =>
                                  navigate('/student/thesis', { state: { openChapterId: row.chapterId } })
                                }
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="d-block d-md-none">
                    <div className="d-flex flex-column gap-2">
                      {unreadChapters.map((row) => (
                        <div key={row.chapterId} className="border rounded p-2 bg-light">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <div className="fw-bold small text-truncate" style={{ maxWidth: '70%' }}>
                              {row.chapterTitle}
                            </div>
                            <span className="badge bg-info text-dark">
                              {row.count}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center small text-muted mb-2">
                            <span>Latest: {new Date(row.latest).toLocaleDateString()}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="w-100"
                            onClick={() =>
                              navigate('/student/thesis', { state: { openChapterId: row.chapterId } })
                            }
                          >
                            View in Editor
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Actions / Deadlines */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white border-0 py-3">
              <h5 className="mb-0 fw-bold">Next Steps</h5>
            </Card.Header>
            <Card.Body className="pt-0">
              {data.activeChapter ? (
                <div className="d-grid gap-2">
                  <Button variant="primary" onClick={() => navigate('/student/thesis')}>
                    Continue Working on {data.activeChapter.title}
                  </Button>
                  <Button variant="outline-secondary" onClick={() => navigate('/student/chat')}>
                    Message Supervisor
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-muted">No active chapters yet.</p>
                  <Button variant="outline-primary" size="sm" onClick={() => navigate('/student/thesis')}>
                    Manage Chapters
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm bg-primary text-white">
            <Card.Body>
              <h5 className="fw-bold"><FaClock className="me-2" />Upcoming Milestone</h5>
              <p className="opacity-75">Keep track of your submission dates to stay on schedule.</p>

              {nextDeadline ? (
                <div className={`mt-3 p-3 bg-white text-dark rounded ${new Date() > new Date(nextDeadline.due_date) ? 'border border-danger border-2' : ''}`}>
                  <div className="d-flex justify-content-between align-items-start">
                    <small className="text-muted text-uppercase fw-bold">Next Deadline</small>
                    {new Date() > new Date(nextDeadline.due_date) && (
                      <Badge bg="danger">Overdue</Badge>
                    )}
                  </div>
                  <div className="fw-bold fs-4 my-1">
                    {new Date(nextDeadline.due_date).toLocaleDateString()}
                  </div>
                  <div className="d-flex align-items-center small text-muted mb-2">
                    <FaInfoCircle className="me-1" />
                    {nextDeadline.title}
                  </div>

                  {new Date() > new Date(nextDeadline.due_date) && (
                    <div className="mb-2 small text-danger fw-bold">
                      You are behind schedule. Please submit as soon as possible.
                    </div>
                  )}

                  <Button variant="outline-success" size="sm" className="w-100" onClick={markDeadlineComplete}>
                    <FaCheckCircle className="me-1" /> Mark as Completed
                  </Button>
                </div>
              ) : (
                <div className="mt-3 p-2 bg-white bg-opacity-25 rounded">
                  <small>No upcoming pending milestones! 🎉</small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="mt-5">
        <Col>
          <h4 className="fw-bold text-secondary mb-3">Project History</h4>
          {/* Rejected/Stale List */}
          <Row xs={1} md={2} lg={3} className="g-4">
            {data.projects.filter(p => p.status === 'rejected' || p.status === 'stale').map(project => (
              <Col key={project.id}>
                <Card
                  className={`h-100 cursor-pointer ${project.status === 'rejected' ? 'border-danger' : 'bg-light border-0'}`}
                  style={{ cursor: 'pointer', opacity: project.status === 'stale' ? 0.75 : 1 }}
                  onClick={() => handleProjectClick(project)}
                >
                  <Card.Body>
                    <Card.Title className={project.status === 'stale' ? 'text-muted' : ''}>{project.title}</Card.Title>
                    <Card.Text className="text-muted small" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</Card.Text>

                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className={`badge bg-${project.status === 'rejected' ? 'danger' : 'secondary'}`}>
                        {project.status === 'rejected' ? 'Rejected' : 'Stale'}
                      </span>
                      <small className="text-muted">{new Date(project.created_at).toLocaleDateString()}</small>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
            {data.projects.filter(p => p.status === 'rejected' || p.status === 'stale').length === 0 && (
              <Col xs={12}>
                <p className="text-muted">No other project history.</p>
              </Col>
            )}
          </Row>
        </Col>
      </Row>

      {/* Project Details Modal (For Active View) */}
      <ProjectDetailsModal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        project={selectedProject}
        userRole="student"
        onUpdate={() => {
          fetchDashboardData();
          setShowDetailsModal(false);
        }}
      />

    </Container>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'approved': return 'success';
    case 'submitted': return 'info';
    case 'in_progress': return 'primary';
    case 'pending': return 'secondary';
    default: return 'light text-dark';
  }
};

export default Dashboard;
