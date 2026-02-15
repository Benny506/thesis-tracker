import React, { useState } from 'react';
import { Form, Button, Card, Container, InputGroup } from 'react-bootstrap';
import { useFormik } from 'formik';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../../lib/supabase';
import { forgotPasswordSchema, resetPasswordSchema } from '../../../lib/validation';
import { setLoading, showToast } from '../../../store/slices/uiSlice';
import Logo from '../../../components/common/Logo';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form for Step 1: Request OTP
  const requestFormik = useFormik({
    initialValues: { email: '' },
    validationSchema: forgotPasswordSchema,
    onSubmit: async (values) => {
      console.log('ForgotPassword: Submit started', values);
      dispatch(setLoading({ isVisible: true, message: 'Sending Reset Code...' }));
      try {
        console.log('ForgotPassword: Invoking auth-proxy via RAW FETCH...');
        
        // Add 15s timeout to prevent infinite spinner
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        // Normalize email
        const emailLower = values.email.toLowerCase();

        const response = await fetch(`${supabaseUrl}/functions/v1/auth-proxy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
                action: 'send-otp',
                email: emailLower,
                type: 'reset'
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        const data = await response.json();
        
        console.log('ForgotPassword: Fetch result', { status: response.status, data });

        if (!response.ok) {
            throw new Error(data.error || 'Failed to send OTP');
        }

        setEmail(emailLower);
        
         // Success - Mock OTP display
         if (data.mockCode) {
            dispatch(showToast({ message: `Dev Mode Code: ${data.mockCode}`, type: 'success' }));
            // Also log it for easier copying
            console.log('DEV MODE CODE:', data.mockCode);
         } else {
            dispatch(showToast({ message: 'Verification code sent to your email.', type: 'success' }));
         }

        setStep('verify');
      } catch (err) {
        console.error('ForgotPassword: Catch error', err);
        if (err.name === 'AbortError') {
             dispatch(showToast({ message: 'Request timed out. Please check your connection.', type: 'error' }));
        } else {
             dispatch(showToast({ message: err.message || 'Failed to send reset code', type: 'error' }));
        }
      } finally {
        dispatch(setLoading(false));
      }
    },
  });

  // Form for Step 2: Verify OTP & Reset Password
  const verifyFormik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema: resetPasswordSchema,
    onSubmit: async (values) => {
      if (!otp) {
        dispatch(showToast({ message: 'Please enter the verification code', type: 'warning' }));
        return;
      }
      dispatch(setLoading({ isVisible: true, message: 'Resetting Password...' }));
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${supabaseUrl}/functions/v1/auth-proxy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
                action: 'verify-otp',
                email: email,
                code: otp,
                type: 'reset',
                password: values.password
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Verification failed');
        }

        // Success - Redirect to Login
        dispatch(showToast({ message: 'Password updated successfully! Please sign in.', type: 'success' }));
        setTimeout(() => navigate('/login'), 1500);

      } catch (err) {
        if (err.name === 'AbortError') {
             dispatch(showToast({ message: 'Request timed out. Please check your connection.', type: 'error' }));
        } else {
             dispatch(showToast({ message: err.message || 'Failed to reset password', type: 'error' }));
        }
      } finally {
        dispatch(setLoading(false));
      }
    },
  });

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100 py-5">
      <Card className="auth-card p-4" style={{ maxWidth: '420px', width: '100%' }}>
        <Card.Body>
          <div className="text-center mb-4">
             <div className="d-flex justify-content-center mb-3">
              <Logo size={40} />
            </div>
            <h4 className="fw-bold text-secondary">Reset Password</h4>
            <p className="text-muted small">
                {step === 'request' ? 'Enter your email to receive a code' : 'Enter code and new password'}
            </p>
          </div>

          {step === 'request' ? (
            <Form onSubmit={requestFormik.handleSubmit}>
                <Form.Group className="mb-4" controlId="email">
                <Form.Label className="small fw-bold text-secondary">Email Address</Form.Label>
                <Form.Control
                    type="email"
                    placeholder="name@example.com"
                    {...requestFormik.getFieldProps('email')}
                    isInvalid={requestFormik.touched.email && requestFormik.errors.email}
                    className="py-2"
                />
                <Form.Control.Feedback type="invalid">
                    {requestFormik.errors.email}
                </Form.Control.Feedback>
                </Form.Group>

                <Button 
                variant="primary" 
                type="submit" 
                className="w-100 mb-4 py-2 text-uppercase" 
                style={{ letterSpacing: '1px' }}
                >
                Send Code
                </Button>

                <div className="text-center">
                <Link to="/login" className="text-decoration-none fw-bold text-secondary small">
                    &larr; Back to Login
                </Link>
                </div>
            </Form>
          ) : (
            <Form onSubmit={verifyFormik.handleSubmit}>
                <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold text-secondary">Verification Code</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="py-2 text-center"
                        style={{ letterSpacing: '4px' }}
                        maxLength={6}
                    />
                </Form.Group>

                <Form.Group className="mb-3" controlId="password">
                    <Form.Label className="small fw-bold text-secondary">New Password</Form.Label>
                    <InputGroup hasValidation>
                        <Form.Control
                        type={showPassword ? "text" : "password"}
                        placeholder="New password"
                        {...verifyFormik.getFieldProps('password')}
                        isInvalid={verifyFormik.touched.password && verifyFormik.errors.password}
                        className="py-2 has-border-right-0"
                        />
                        <InputGroup.Text 
                        onClick={() => setShowPassword(!showPassword)}
                        className="bg-white border-start-0 text-muted"
                        >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </InputGroup.Text>
                        <Form.Control.Feedback type="invalid">
                        {verifyFormik.errors.password}
                        </Form.Control.Feedback>
                    </InputGroup>
                </Form.Group>

                <Form.Group className="mb-4" controlId="confirmPassword">
                    <Form.Label className="small fw-bold text-secondary">Confirm Password</Form.Label>
                    <Form.Control
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        {...verifyFormik.getFieldProps('confirmPassword')}
                        isInvalid={verifyFormik.touched.confirmPassword && verifyFormik.errors.confirmPassword}
                        className="py-2"
                    />
                    <Form.Control.Feedback type="invalid">
                        {verifyFormik.errors.confirmPassword}
                    </Form.Control.Feedback>
                </Form.Group>

                <Button 
                variant="primary" 
                type="submit" 
                className="w-100 mb-3 py-2 text-uppercase" 
                style={{ letterSpacing: '1px' }}
                >
                Update Password
                </Button>
                
                <Button 
                    variant="link" 
                    className="w-100 text-muted small text-decoration-none"
                    onClick={() => setStep('request')}
                >
                    Back (Change Email)
                </Button>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ForgotPassword;
