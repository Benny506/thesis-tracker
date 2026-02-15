import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Badge } from 'react-bootstrap';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../lib/supabase';
import { FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

const ProjectDetailsModal = ({ show, onHide, project, userRole, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);

    // Reset state when modal opens/closes or project changes
    useEffect(() => {
        setIsEditing(false);
        setError(null);
    }, [show, project]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            title: project?.title || '',
            description: project?.description || '',
            modification_reason: '' // Only for supervisors
        },
        validationSchema: Yup.object({
            title: Yup.string().required('Title is required'),
            description: Yup.string().required('Description is required'),
            modification_reason: userRole === 'supervisor' 
                ? Yup.string().required('Reason for modification is required') 
                : Yup.string()
        }),
        onSubmit: async (values) => {
            try {
                setError(null);
                
                const updates = {
                    title: values.title,
                    description: values.description,
                    // If supervisor, save the reason. If student, clear it (optional, or keep history? 
                    // Prompt says "student updates can overwrite supervisor updates and vice versa"
                    // and "attach a reason which will be visible to the student". 
                    // Let's update the reason column if supervisor, or maybe keep it if student? 
                    // Usually if student edits, the previous supervisor reason might be irrelevant now.
                    // Let's clear it if student edits, or set it if supervisor edits.
                    modification_reason: userRole === 'supervisor' ? values.modification_reason : null
                };

                const { error: updateError } = await supabase
                    .from('projects')
                    .update(updates)
                    .eq('id', project.id);

                if (updateError) throw updateError;

                onUpdate(); // Refresh parent data
                setIsEditing(false);
            } catch (err) {
                setError(err.message);
            }
        }
    });

    if (!project) return null;

    const canEdit = project.status === 'pending_approval';

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title className="fw-bold">
                    {isEditing ? 'Edit Proposal' : 'Project Proposal Details'}
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={formik.handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}

                    {/* View Mode */}
                    {!isEditing && (
                        <div className="d-flex flex-column gap-3">
                            <div>
                                <h5 className="fw-bold text-dark mb-1">{project.title}</h5>
                                <div className="d-flex gap-2 mb-3">
                                    <Badge bg={
                                        project.status === 'approved' ? 'success' :
                                        project.status === 'rejected' ? 'danger' :
                                        project.status === 'stale' ? 'secondary' : 'warning'
                                    }>
                                        {project.status.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                    <small className="text-muted align-self-center">
                                        Created: {new Date(project.created_at).toLocaleDateString()}
                                    </small>
                                </div>
                            </div>

                            <div>
                                <h6 className="fw-bold text-secondary">Description</h6>
                                <p className="text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                                    {project.description}
                                </p>
                            </div>

                            {/* Show Modification Reason if it exists (Supervisor Feedback) */}
                            {project.modification_reason && (
                                <Alert variant="info" className="mt-2">
                                    <h6 className="alert-heading fw-bold small">
                                        <FaEdit className="me-2" />
                                        Latest Feedback from Supervisor:
                                    </h6>
                                    <p className="mb-0 small">{project.modification_reason}</p>
                                </Alert>
                            )}
                             
                             {/* Show Rejection Reason if rejected */}
                             {project.rejection_reason && project.status === 'rejected' && (
                                <Alert variant="danger" className="mt-2">
                                    <h6 className="alert-heading fw-bold small">Rejection Reason:</h6>
                                    <p className="mb-0 small">{project.rejection_reason}</p>
                                </Alert>
                            )}
                        </div>
                    )}

                    {/* Edit Mode */}
                    {isEditing && (
                        <div className="d-flex flex-column gap-3">
                            <Form.Group>
                                <Form.Label className="fw-bold">Project Title</Form.Label>
                                <Form.Control
                                    type="text"
                                    {...formik.getFieldProps('title')}
                                    isInvalid={formik.touched.title && formik.errors.title}
                                />
                                <Form.Control.Feedback type="invalid">{formik.errors.title}</Form.Control.Feedback>
                            </Form.Group>

                            <Form.Group>
                                <Form.Label className="fw-bold">Description</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={6}
                                    {...formik.getFieldProps('description')}
                                    isInvalid={formik.touched.description && formik.errors.description}
                                />
                                <Form.Control.Feedback type="invalid">{formik.errors.description}</Form.Control.Feedback>
                            </Form.Group>

                            {/* Supervisor Reason Field */}
                            {userRole === 'supervisor' && (
                                <Form.Group className="bg-light p-3 rounded border">
                                    <Form.Label className="fw-bold text-primary">
                                        Reason for Changes (Visible to Student)
                                    </Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        placeholder="Explain why you are modifying this proposal..."
                                        {...formik.getFieldProps('modification_reason')}
                                        isInvalid={formik.touched.modification_reason && formik.errors.modification_reason}
                                    />
                                    <Form.Control.Feedback type="invalid">{formik.errors.modification_reason}</Form.Control.Feedback>
                                    <Form.Text className="text-muted">
                                        This feedback helps the student understand your edits.
                                    </Form.Text>
                                </Form.Group>
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {!isEditing ? (
                        <>
                            <Button variant="secondary" onClick={onHide}>Close</Button>
                            {canEdit && (
                                <Button variant="primary" onClick={() => setIsEditing(true)}>
                                    <FaEdit className="me-2" />
                                    Edit Proposal
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            <Button variant="outline-secondary" onClick={() => setIsEditing(false)}>
                                Cancel
                            </Button>
                            <Button variant="success" type="submit" disabled={formik.isSubmitting}>
                                {formik.isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </>
                    )}
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default ProjectDetailsModal;
