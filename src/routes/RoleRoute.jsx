import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner, Container } from 'react-bootstrap';

const RoleRoute = ({ allowedRoles }) => {
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

  // Wait for profile to load if it's missing but user exists (edge case)
  // Although AuthContext should handle this, sometimes profile is null briefly
  if (!profile) {
      // You might want to show a spinner here too, or just let it fall through 
      // if you trust AuthContext sets loading=true until profile is fetched.
      // Based on AuthContext, it sets loading=false only after fetchProfile.
      // So if loading is false, profile should be set (or null if error).
      
      // If profile is null but loading is false, it might mean profile fetch failed.
      // In that case, maybe let them through or error out. 
      // For now, let's assume if profile is missing, we can't authorize role.
      return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(profile.role)) {
    // Redirect based on their actual role
    if (profile.role === 'student') return <Navigate to="/student" replace />;
    if (profile.role === 'supervisor') return <Navigate to="/supervisor" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;