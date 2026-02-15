import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner, Container } from 'react-bootstrap';

const RootRedirect = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === 'supervisor') {
    return <Navigate to="/supervisor" replace />;
  }
  
  // Default to student
  return <Navigate to="/student" replace />;
};

export default RootRedirect;