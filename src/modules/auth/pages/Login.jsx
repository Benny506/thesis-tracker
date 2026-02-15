import React, { useState } from 'react';
import { Form, Button, Card, Container, InputGroup } from 'react-bootstrap';
import { useFormik } from 'formik';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../../context/AuthContext';
import { loginSchema } from '../../../lib/validation';
import { setLoading, showToast } from '../../../store/slices/uiSlice';
import Logo from '../../../components/common/Logo';

import { supabase } from '../../../lib/supabase';

const Login = () => {
  const { signIn } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      console.log('Login: Submit started', values.email);
      dispatch(setLoading({ isVisible: true, message: 'Signing In...' }));
      try {
        console.log('Login: calling signIn...');
        const { data, error } = await signIn(values.email, values.password);
        console.log('Login: signIn returned', { error });
        
        if (error) throw error;
        
        // Fetch Profile to determine role
        if (data?.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            dispatch(showToast({ message: 'Welcome back!', type: 'success' }));
            
            if (profile?.role === 'supervisor') {
                navigate('/supervisor');
            } else {
                navigate('/student');
            }
        } else {
             navigate('/');
        }

      } catch (err) {
        console.error('Login: error caught', err);
        dispatch(showToast({ message: err.message || 'Failed to login', type: 'error' }));
      } finally {
        console.log('Login: finally block');
        dispatch(setLoading(false));
      }
    },
  });

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100 py-5">
      <Card className="auth-card p-4" style={{ maxWidth: '420px', width: '100%' }}>
        <Card.Body>
          <div className="text-center mb-5">
            <div className="d-flex justify-content-center mb-3">
              <Logo size={48} />
            </div>
            <h4 className="fw-bold text-secondary">Welcome Back</h4>
            <p className="text-muted small">Sign in to continue your progress</p>
          </div>

          <Form onSubmit={formik.handleSubmit}>
            <Form.Group className="mb-3" controlId="email">
              <Form.Label className="small fw-bold text-secondary">Email Address</Form.Label>
              <Form.Control
                type="email"
                placeholder="name@example.com"
                {...formik.getFieldProps('email')}
                isInvalid={formik.touched.email && formik.errors.email}
                className="py-2"
              />
              <Form.Control.Feedback type="invalid">
                {formik.errors.email}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-4" controlId="password">
              <div className="d-flex justify-content-between align-items-center">
                <Form.Label className="small fw-bold text-secondary">Password</Form.Label>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem' }} className="text-primary text-decoration-none fw-medium">
                  Forgot Password?
                </Link>
              </div>
              <InputGroup hasValidation>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...formik.getFieldProps('password')}
                  isInvalid={formik.touched.password && formik.errors.password}
                  className="py-2 has-border-right-0"
                />
                <InputGroup.Text 
                  onClick={() => setShowPassword(!showPassword)}
                  className="bg-white border-start-0 text-muted"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </InputGroup.Text>
                <Form.Control.Feedback type="invalid">
                  {formik.errors.password}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>

            <Button 
              variant="primary" 
              type="submit" 
              className="w-100 mb-4 py-2 text-uppercase letter-spacing-1" 
              style={{ letterSpacing: '1px' }}
            >
              Sign In
            </Button>

            <div className="text-center">
              <span className="text-muted small">Don't have an account? </span>
              <Link to="/register" className="text-decoration-none fw-bold text-primary ms-1">Create Account</Link>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;
