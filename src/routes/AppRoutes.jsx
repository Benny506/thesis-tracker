import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import RoleRoute from './RoleRoute';
import RootRedirect from './RootRedirect';

// Auth Pages
import Login from '../modules/auth/pages/Login';
import Register from '../modules/auth/pages/Register';
import ForgotPassword from '../modules/auth/pages/ForgotPassword';
import ResetPassword from '../modules/auth/pages/ResetPassword';

// Student Module
import StudentLayout from '../modules/student/layouts/StudentLayout';
import StudentDashboard from '../modules/student/pages/Dashboard';
import ThesisBoard from '../modules/student/pages/ThesisBoard';
import StudentChat from '../modules/student/pages/StudentChat';
import StudentProfile from '../modules/student/pages/Profile';

// Supervisor Module
import SupervisorLayout from '../modules/supervisor/layouts/SupervisorLayout';
import SupervisorDashboard from '../modules/supervisor/pages/Dashboard';
import SupervisorProjects from '../modules/supervisor/pages/Projects';
import SupervisorChat from '../modules/supervisor/pages/SupervisorChat';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Student Routes */}
      <Route element={<RoleRoute allowedRoles={['student']} />}>
        <Route path="/student" element={<StudentLayout />}>
            <Route index element={<StudentDashboard />} />
            <Route path="thesis" element={<ThesisBoard />} />
            <Route path="chat" element={<StudentChat />} />
            <Route path="profile" element={<StudentProfile />} />
        </Route>
      </Route>

      {/* Protected Supervisor Routes */}
      <Route element={<RoleRoute allowedRoles={['supervisor']} />}>
        <Route path="/supervisor" element={<SupervisorLayout />}>
            <Route index element={<SupervisorDashboard />} />
            <Route path="projects" element={<SupervisorProjects />} />
            <Route path="chat" element={<SupervisorChat />} />
        </Route>
      </Route>

      {/* Root Redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Catch all - redirect to root (which redirects based on role) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
