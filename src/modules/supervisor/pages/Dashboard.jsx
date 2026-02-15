import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Spinner, Modal, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { FaCheck, FaTimes, FaUserGraduate, FaInfoCircle, FaClock, FaPlus, FaBook } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../store/slices/uiSlice';
import ProjectDetailsModal from '../../../components/projects/ProjectDetailsModal';
import SupervisorThesisViewer from '../components/SupervisorThesisViewer';

const SupervisorDashboard = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [pendingProjects, setPendingProjects] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  const [rejectedProjects, setRejectedProjects] = useState([]);
  const [staleProjects, setStaleProjects] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingChapterCounts, setPendingChapterCounts] = useState({});

  // Rejection/Revoke State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);
  const [actionType, setActionType] = useState('reject'); // 'reject' | 'revoke'

  // Details Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsProject, setDetailsProject] = useState(null);

  // Thesis Viewer State
  const [showThesisViewer, setShowThesisViewer] = useState(false);
  const [thesisProject, setThesisProject] = useState(null);

  const openThesisViewer = (project) => {
      setThesisProject(project);
      setShowThesisViewer(true);
  };

  const openDetailsModal = (project) => {
      setDetailsProject(project);
      setShowDetailsModal(true);
  };

  // Deadline Management State
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlineProject, setDeadlineProject] = useState(null);
  const [projectDeadlines, setProjectDeadlines] = useState([]);
  const [loadingDeadlines, setLoadingDeadlines] = useState(false);
  const [nextDeadline, setNextDeadline] = useState(null);
  
  // New Deadline Form
  const [newDeadlineDate, setNewDeadlineDate] = useState('');
  const [newDeadlineNote, setNewDeadlineNote] = useState('');
  const [submittingDeadline, setSubmittingDeadline] = useState(false);

  const openDeadlineModal = async (project) => {
      setDeadlineProject(project);
      setShowDeadlineModal(true);
      setNewDeadlineDate('');
      setNewDeadlineNote('');
      fetchDeadlines(project.id);
  };

  const fetchDeadlines = async (projectId) => {
      setLoadingDeadlines(true);
      const { data, error } = await supabase
        .from('project_deadlines')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true });
      
      if (error) {
          console.error('Error fetching deadlines:', error);
      } else {
          setProjectDeadlines(data || []);
      }
      setLoadingDeadlines(false);
  };

  const handleAddDeadline = async () => {
    if (!newDeadlineDate || !newDeadlineNote.trim()) {
        dispatch(showToast({ message: 'Please provide both date and note.', type: 'warning' }));
        return;
    }

    setSubmittingDeadline(true);
    try {
        const { error } = await supabase
            .from('project_deadlines')
            .insert({
                project_id: deadlineProject.id,
                title: newDeadlineNote,
                due_date: new Date(newDeadlineDate).toISOString(),
                created_by: user.id
            });

        if (error) throw error;

        dispatch(showToast({ message: 'New Deadline Added.', type: 'success' }));
        setNewDeadlineDate('');
        setNewDeadlineNote('');
        fetchDeadlines(deadlineProject.id); // Refresh list
    } catch (err) {
        dispatch(showToast({ message: err.message, type: 'error' }));
    } finally {
        setSubmittingDeadline(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!user) return;

        // Fetch Projects assigned to this supervisor
        // Note: We need to ensure the RLS policy "Supervisors can view assigned projects" is working.
        // It relies on auth.uid() = supervisor_id.
        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            student:student_id (
              id,
              full_name
            )
          `)
          .eq('supervisor_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          setPendingProjects(data.filter(p => p.status === 'pending_approval'));
          const actives = data.filter(p => p.status === 'active' || p.status === 'completed');
          setActiveProjects(actives);
          setRejectedProjects(data.filter(p => p.status === 'rejected'));
          setStaleProjects(data.filter(p => p.status === 'stale'));
          // Fetch pending review chapter counts for active projects
          if (actives.length > 0) {
            const ids = actives.map(p => p.id);
            const { data: ch, error: chErr } = await supabase
              .from('chapters')
              .select('project_id,id')
              .in('project_id', ids)
              .eq('status', 'submitted');
            if (!chErr && ch) {
              const map = {};
              ch.forEach(row => {
                map[row.project_id] = (map[row.project_id] || 0) + 1;
              });
              setPendingChapterCounts(map);
            } else {
              setPendingChapterCounts({});
            }

            const { data: deadlines, error: deadlineError } = await supabase
              .from('project_deadlines')
              .select('*')
              .in('project_id', ids)
              .eq('is_completed', false)
              .order('due_date', { ascending: true })
              .limit(1);

            if (!deadlineError && deadlines && deadlines.length > 0) {
              setNextDeadline(deadlines[0]);
            } else {
              setNextDeadline(null);
            }
          } else {
            setPendingChapterCounts({});
            setNextDeadline(null);
          }
        }

      } catch (err) {
        console.error('Error fetching supervisor dashboard:', err);
        dispatch(showToast({ message: 'Failed to load projects: ' + err.message, type: 'error' }));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, refreshTrigger, dispatch]);

  // Approval State
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveProject, setApproveProject] = useState(null);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineNote, setDeadlineNote] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const openApproveModal = (project) => {
    setApproveProject(project);
    setDeadlineDate(''); 
    setDeadlineNote('Chapter 1 Submission'); // Default note
    setShowApproveModal(true);
  };

  const handleApproveConfirm = async () => {
    if (!deadlineDate) {
         dispatch(showToast({ message: 'Please set the first deadline date.', type: 'warning' }));
         return;
    }
    if (!deadlineNote.trim()) {
         dispatch(showToast({ message: 'Please provide a note for what this deadline is for.', type: 'warning' }));
         return;
    }

    setSubmittingApproval(true);
    try {
      dispatch(setLoading({ isVisible: true, message: 'Approving project...' }));
      // 1. Update Project Status
      const { error: projectError } = await supabase
        .from('projects')
        .update({ status: 'active' })
        .eq('id', approveProject.id);

      if (projectError) throw projectError;

      // 2. Create First Deadline
      const { error: deadlineError } = await supabase
        .from('project_deadlines')
        .insert({
            project_id: approveProject.id,
            title: deadlineNote,
            due_date: new Date(deadlineDate).toISOString(),
            created_by: user.id
        });

      if (deadlineError) throw deadlineError;

      dispatch(showToast({ message: 'Project Approved & First Deadline Set.', type: 'success' }));
      setRefreshTrigger(prev => prev + 1);
      setShowApproveModal(false);
    } catch (err) {
      dispatch(showToast({ message: err.message, type: 'error' }));
    } finally {
      setSubmittingApproval(false);
      dispatch(setLoading(false));
    }
  };

  const openRejectModal = (project, type = 'reject') => {
      setSelectedProject(project);
      setActionType(type);
      setRejectionReason('');
      setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
      if (!rejectionReason.trim()) {
          dispatch(showToast({ message: 'Please provide a reason.', type: 'warning' }));
          return;
      }
      
      setSubmittingRejection(true);
      try {
        dispatch(setLoading({ isVisible: true, message: actionType === 'revoke' ? 'Revoking project...' : 'Disapproving project...' }));
        const { error } = await supabase
            .from('projects')
            .update({ 
                status: 'rejected',
                rejection_reason: rejectionReason
            })
            .eq('id', selectedProject.id);
        
        if (error) throw error;

        dispatch(showToast({ message: `Project ${actionType === 'revoke' ? 'Revoked' : 'Disapproved'}`, type: 'info' }));
        setShowRejectModal(false);
        setRefreshTrigger(prev => prev + 1);

      } catch (err) {
        dispatch(showToast({ message: err.message, type: 'error' }));
      } finally {
        setSubmittingRejection(false);
        dispatch(setLoading(false));
      }
  };

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;

  return (
    <Container className="py-4">
      <h2 className="mb-4">Supervisor Dashboard</h2>

      {/* Pending Approvals Section */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3">
            <h5 className="mb-0 text-warning fw-bold">Pending Approvals</h5>
        </Card.Header>
        <Card.Body>
            {pendingProjects.length === 0 ? (
                <p className="text-muted text-center mb-0">No pending project requests.</p>
            ) : (
                <Table hover responsive>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Project Title</th>
                            <th>Date Submitted</th>
                            <th className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingProjects.map(project => (
                            <tr key={project.id}>
                                <td>
                                    <div className="d-flex align-items-center">
                                        <div className="rounded-circle bg-light p-2 me-2">
                                            <FaUserGraduate className="text-secondary" />
                                        </div>
                                        <div>
                                            <div className="fw-bold">{project.student?.full_name || 'Unknown'}</div>
                                            <small className="text-muted">{project.student?.email}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="fw-bold">{project.title}</div>
                                    <small className="text-muted text-truncate d-block" style={{maxWidth: '300px'}}>
                                        {project.description}
                                    </small>
                                </td>
                                <td>{new Date(project.created_at).toLocaleDateString()}</td>
                                <td className="text-end">
                                    <Button variant="outline-info" size="sm" className="me-2" onClick={() => openDetailsModal(project)} title="View Details / Edit">
                                        <FaInfoCircle className="me-1" /> Details
                                    </Button>
                                    <Button variant="success" size="sm" className="me-2" onClick={() => openApproveModal(project)}>
                                        <FaCheck className="me-1" /> Approve
                                    </Button>
                                    <Button variant="outline-danger" size="sm" onClick={() => openRejectModal(project)}>
                                        <FaTimes className="me-1" /> Disapprove
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
        </Card.Body>
      </Card>

      {/* Active Projects Section */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3">
            <h5 className="mb-0 text-success fw-bold">Active Projects</h5>
        </Card.Header>
        <Card.Body>
            {activeProjects.length === 0 ? (
                <p className="text-muted text-center mb-0">No active projects.</p>
            ) : (
                <Table hover responsive className="w-100">
                    <thead>
                        <tr>
                            <th style={{ minWidth: 180 }}>Student</th>
                            <th style={{ minWidth: 260 }}>Project Title</th>
                            <th style={{ minWidth: 160 }}>Current Status</th>
                            <th style={{ minWidth: 180 }}>Next Deadline</th>
                            <th style={{ minWidth: 220 }} className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeProjects.map(project => (
                            <tr key={project.id}>
                                <td>
                                    <div className="d-flex align-items-center">
                                        <div className="rounded-circle bg-light p-2 me-2">
                                            <FaUserGraduate className="text-primary" />
                                        </div>
                                        <span className="fw-bold">{project.student?.full_name}</span>
                                    </div>
                                </td>
                                <td className="text-truncate" style={{ maxWidth: 320 }}>
                                  <div className="d-flex flex-column">
                                    <span className="fw-semibold">{project.title}</span>
                                    {pendingChapterCounts[project.id] > 0 && (
                                      <span className="mt-1">
                                        <Badge bg="warning" text="dark">
                                          {pendingChapterCounts[project.id]} chapter{pendingChapterCounts[project.id] > 1 ? 's' : ''} pending review
                                        </Badge>
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td><Badge bg="success">Active</Badge></td>
                                <td>
                                  {nextDeadline && nextDeadline.project_id === project.id ? (
                                    <div className="small">
                                      <div className="d-flex justify-content-between align-items-center">
                                        <span className="text-muted text-uppercase fw-bold">Next Deadline</span>
                                      </div>
                                      <div className="fw-semibold">
                                        {new Date(nextDeadline.due_date).toLocaleDateString()}
                                      </div>
                                      <div className="text-muted text-truncate" style={{ maxWidth: 220 }}>
                                        {nextDeadline.title}
                                      </div>
                                      <Button
                                        variant="link"
                                        className="p-0 mt-1 text-decoration-none"
                                        size="sm"
                                        onClick={() => openDeadlineModal(project)}
                                      >
                                        View all
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="link"
                                      className="p-0 text-decoration-none"
                                      onClick={() => openDeadlineModal(project)}
                                    >
                                      <FaClock className="me-1" /> Manage Deadlines
                                    </Button>
                                  )}
                                </td>
                                <td className="text-end">
                                    <Button 
                                        variant="primary" 
                                        size="sm" 
                                        className="me-2"
                                        onClick={() => openThesisViewer(project)}
                                    >
                                        <FaBook className="me-1" /> View Thesis
                                    </Button>
                                    <Button 
                                        variant="outline-primary" 
                                        size="sm" 
                                        className="me-2"
                                        onClick={() => openDetailsModal(project)}
                                    >
                                        Details
                                    </Button>
                                    <Button 
                                        variant="outline-danger" 
                                        size="sm"
                                        onClick={() => openRejectModal(project, 'revoke')}
                                    >
                                        Revoke
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
        </Card.Body>
      </Card>

      {/* Manage Deadlines Modal */}
      <Modal show={showDeadlineModal} onHide={() => setShowDeadlineModal(false)} size="lg" centered>
        <Modal.Header closeButton>
            <Modal.Title>Manage Deadlines: {deadlineProject?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
             <div className="mb-4 bg-light p-3 rounded">
                <h6 className="fw-bold text-primary mb-3">Add New Milestone</h6>
                <div className="d-flex gap-3 align-items-end">
                    <Form.Group className="flex-grow-1">
                        <Form.Label className="small fw-bold">Due Date</Form.Label>
                        <Form.Control 
                            type="date" 
                            value={newDeadlineDate} 
                            onChange={(e) => setNewDeadlineDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </Form.Group>
                    <Form.Group className="flex-grow-1" style={{ flex: 2 }}>
                        <Form.Label className="small fw-bold">Milestone Note</Form.Label>
                        <Form.Control 
                            type="text" 
                            placeholder="e.g. Chapter 2 Draft"
                            value={newDeadlineNote} 
                            onChange={(e) => setNewDeadlineNote(e.target.value)}
                        />
                    </Form.Group>
                    <Button variant="primary" onClick={handleAddDeadline} disabled={submittingDeadline}>
                        {submittingDeadline ? <Spinner size="sm" /> : <FaPlus />} Add
                    </Button>
                </div>
             </div>

             <h6 className="fw-bold">Deadline History</h6>
             {loadingDeadlines ? (
                 <div className="text-center py-3"><Spinner size="sm" /> Loading...</div>
             ) : projectDeadlines.length === 0 ? (
                 <p className="text-muted small">No deadlines set yet.</p>
             ) : (
                 <Table size="sm" hover>
                     <thead>
                         <tr>
                             <th>Due Date</th>
                             <th>Milestone</th>
                             <th>Status</th>
                         </tr>
                     </thead>
                     <tbody>
                         {projectDeadlines.map((dl, idx) => (
                             <tr key={dl.id} className={dl.is_completed ? 'table-success' : new Date() > new Date(dl.due_date) ? 'table-danger' : ''}>
                                 <td>{new Date(dl.due_date).toLocaleDateString()}</td>
                                 <td>{dl.title}</td>
                                 <td>
                                     {dl.is_completed ? (
                                         <Badge bg="success">Completed</Badge>
                                     ) : new Date() > new Date(dl.due_date) ? (
                                         <Badge bg="danger">Overdue</Badge>
                                     ) : (
                                         <Badge bg="primary">Pending</Badge>
                                     )}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </Table>
             )}
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeadlineModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Approval Modal */}
      <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)} centered>
        <Modal.Header closeButton>
            <Modal.Title>Approve Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <p>You are about to approve <strong>{approveProject?.title}</strong> for <strong>{approveProject?.student?.full_name}</strong>.</p>
            <Alert variant="warning" className="small">
                Note: Approving this project will automatically mark all other pending proposals from this student as <strong>stale</strong>.
            </Alert>
            
            <h6 className="fw-bold mt-4 mb-3 text-primary">Set First Milestone Deadline</h6>
            
            <Form.Group className="mb-3">
                <Form.Label className="fw-bold small">Deadline Date</Form.Label>
                <Form.Control 
                    type="date" 
                    value={deadlineDate} 
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                />
            </Form.Group>

             <Form.Group className="mb-3">
                <Form.Label className="fw-bold small">What is this deadline for?</Form.Label>
                <Form.Control 
                    type="text" 
                    placeholder="e.g. Chapter 1 Submission, Literature Review Draft..."
                    value={deadlineNote} 
                    onChange={(e) => setDeadlineNote(e.target.value)}
                    required
                />
            </Form.Group>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowApproveModal(false)}>Cancel</Button>
            <Button 
                variant="success" 
                onClick={handleApproveConfirm} 
                disabled={submittingApproval}
            >
                {submittingApproval ? 'Approving...' : 'Approve & Set Deadline'}
            </Button>
        </Modal.Footer>
      </Modal>

      {/* Stale Projects (Previously Submitted but not selected) */}
      {staleProjects.length > 0 && (
          <Card className="border-0 shadow-sm mb-4 opacity-75">
            <Card.Header className="bg-white py-3">
                <h5 className="mb-0 text-secondary fw-bold">Stale Proposals</h5>
                <small className="text-muted">Proposals that were automatically set to stale because another project was approved.</small>
            </Card.Header>
            <Card.Body>
                <Table hover responsive size="sm">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Project Title</th>
                            <th>Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staleProjects.map(project => (
                            <tr key={project.id}>
                                <td>{project.student?.full_name}</td>
                                <td>{project.title}</td>
                                <td>{new Date(project.created_at).toLocaleDateString()}</td>
                                <td>
                                    <Button variant="outline-success" size="sm" onClick={() => handleApprove(project.id)}>
                                        Revive & Approve
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card.Body>
          </Card>
      )}
      
      {/* Rejected Projects History (Optional, but good for record) */}
      {rejectedProjects.length > 0 && (
          <Card className="border-0 shadow-sm opacity-75">
            <Card.Header className="bg-white py-3">
                <h5 className="mb-0 text-muted fw-bold">Rejected History</h5>
            </Card.Header>
            <Card.Body>
                <Table hover responsive size="sm" className="w-100">
                    <thead>
                        <tr>
                            <th style={{ minWidth: 180 }}>Student</th>
                            <th style={{ minWidth: 260 }}>Project Title</th>
                            <th style={{ minWidth: 240 }}>Rejection Reason</th>
                            <th style={{ minWidth: 140 }}>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rejectedProjects.map(project => (
                            <tr key={project.id}>
                                <td className="text-truncate" style={{ maxWidth: 260 }}>{project.student?.full_name}</td>
                                <td className="text-truncate" style={{ maxWidth: 320 }}>{project.title}</td>
                                <td className="text-danger small text-truncate" style={{ maxWidth: 420 }}>{project.rejection_reason}</td>
                                <td>{new Date(project.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card.Body>
          </Card>
      )}

      {/* Rejection Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
        <Modal.Header closeButton>
            <Modal.Title>Disapprove Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <p>You are about to disapprove <strong>{selectedProject?.title}</strong>.</p>
            <Form.Group>
                <Form.Label>Reason for Disapproval <span className="text-danger">*</span></Form.Label>
                <Form.Control 
                    as="textarea" 
                    rows={3} 
                    placeholder="Explain why the project is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                />
            </Form.Group>
            <p className="text-muted small mt-2">
                Note: This action is final. The student will be notified and asked to submit a new proposal.
            </p>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button 
                variant="danger" 
                onClick={handleRejectConfirm}
                disabled={submittingRejection}
            >
                {submittingRejection ? 'Disapproving...' : 'Confirm Disapproval'}
            </Button>
        </Modal.Footer>
      </Modal>

      {/* Project Details Modal */}
      <ProjectDetailsModal
          show={showDetailsModal}
          onHide={() => setShowDetailsModal(false)}
          project={detailsProject}
          userRole="supervisor"
          onUpdate={() => {
              setRefreshTrigger(prev => prev + 1);
              setShowDetailsModal(false);
          }}
      />

      {/* Thesis Viewer Modal */}
      <SupervisorThesisViewer
          show={showThesisViewer}
          onHide={() => setShowThesisViewer(false)}
          project={thesisProject}
      />
    </Container>
  );
};

export default SupervisorDashboard;
