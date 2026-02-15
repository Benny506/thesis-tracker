import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Container, InputGroup } from 'react-bootstrap';
import { useFormik } from 'formik';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { supabase } from '../../../lib/supabase';
import { resetPasswordSchema } from '../../../lib/validation';
import { setLoading, showToast } from '../../../store/slices/uiSlice';
import Logo from '../../../components/common/Logo';

const ResetPassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);

  // Check if we have a session (user clicked magic link)
  useEffect(() => {
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            dispatch(showToast({ message: 'Invalid or expired reset link. Please try again.', type: 'error' }));
            navigate('/forgot-password');
        }
    };
    checkSession();
  }, [navigate, dispatch]);

  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema: resetPasswordSchema,
    onSubmit: async (values) => {
      dispatch(setLoading({ isVisible: true, message: 'Updating Password...' }));
      try {
        const { error } = await supabase.auth.updateUser({
            password: values.password
        });

        if (error) throw error;

        dispatch(showToast({ message: 'Password updated successfully! Please sign in.', type: 'success' }));
        navigate('/login');

      } catch (err) {
        console.error('Reset Password Error:', err);
        dispatch(showToast({ message: err.message || 'Failed to update password', type: 'error' }));
      } finally {
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
            <h4 className="fw-bold text-secondary">Reset Password</h4>
            <p className="text-muted small">Enter your new password below</p>
          </div>

          <Form onSubmit={formik.handleSubmit}>
            <Form.Group className="mb-3" controlId="password">
              <Form.Label className="small fw-bold text-secondary">New Password</Form.Label>
              <InputGroup hasValidation>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
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

            <Form.Group className="mb-4" controlId="confirmPassword">
              <Form.Label className="small fw-bold text-secondary">Confirm Password</Form.Label>
              <Form.Control
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                {...formik.getFieldProps('confirmPassword')}
                isInvalid={formik.touched.confirmPassword && formik.errors.confirmPassword}
                className="py-2"
              />
              <Form.Control.Feedback type="invalid">
                {formik.errors.confirmPassword}
              </Form.Control.Feedback>
            </Form.Group>

            <Button 
              variant="primary" 
              type="submit" 
              className="w-100 mb-4 py-2 text-uppercase" 
              style={{ letterSpacing: '1px' }}
            >
              Update Password
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ResetPassword;