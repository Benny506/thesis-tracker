import React, { useState } from 'react';
import { Form, Button, Card, Container, InputGroup } from 'react-bootstrap';
import { useFormik } from 'formik';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../../context/AuthContext';
import { registerSchema } from '../../../lib/validation';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../../lib/supabase';
import { setLoading, showToast } from '../../../store/slices/uiSlice';
import Logo from '../../../components/common/Logo';

const Register = () => {
  const { signUp } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState('register'); // 'register' | 'otp'
  const [otp, setOtp] = useState('');

  const formik = useFormik({
    initialValues: {
      fullName: '',
      email: '',
      password: '',
      role: 'student', 
    },
    validationSchema: registerSchema,
    onSubmit: async (values) => {
      dispatch(setLoading({ isVisible: true, message: 'Sending Verification Code...' }));
      try {
        // Call Edge Function to send OTP
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${supabaseUrl}/functions/v1/auth-proxy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
                action: 'send-otp',
                email: values.email,
                type: 'signup'
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to send OTP');
        }

        // Success - Mock OTP display
        if (data.mockCode) {
           dispatch(showToast({ message: `Verification code sent! (Dev Mode: ${data.mockCode})`, type: 'success' }));
        } else {
           dispatch(showToast({ message: 'Verification code sent to your email.', type: 'success' }));
        }
        
        setStep('otp');

      } catch (err) {
        console.error(err);
        if (err.name === 'AbortError') {
            dispatch(showToast({ message: 'Request timed out. Please check your connection.', type: 'error' }));
        } else {
            dispatch(showToast({ message: err.message || 'Failed to start registration', type: 'error' }));
        }
      } finally {
        dispatch(setLoading(false));
      }
    },
  });

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
        dispatch(showToast({ message: 'Please enter the verification code', type: 'warning' }));
        return;
    }
    dispatch(setLoading({ isVisible: true, message: 'Creating Account...' }));
    
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
                email: formik.values.email,
                code: otp,
                type: 'signup',
                password: formik.values.password,
                data: {
                    full_name: formik.values.fullName,
                    role: formik.values.role
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Verification failed');
        }
        
        if (data.session) {
            const { error: sessionError } = await supabase.auth.setSession(data.session);
            if (sessionError) throw sessionError;
            
            // Create Profile (if not created by trigger)
             const { data: profileCheck } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single();

            if (!profileCheck) {
                await supabase
                .from('profiles')
                .insert([
                    {
                    id: data.user.id,
                    full_name: formik.values.fullName,
                    role: formik.values.role,
                    created_at: new Date(),
                    }
                ]);
            }
            
            dispatch(showToast({ message: 'Welcome to ThesisTrack!', type: 'success' }));
            
            if (formik.values.role === 'supervisor') {
                navigate('/supervisor');
            } else {
                navigate('/student');
            }
        } else {
            dispatch(showToast({ message: 'Account created! Please sign in.', type: 'success' }));
            setTimeout(() => navigate('/login'), 2000);
        }

    } catch (err) {
        console.error(err);
        if (err.name === 'AbortError') {
            dispatch(showToast({ message: 'Request timed out. Please check your connection.', type: 'error' }));
        } else {
            dispatch(showToast({ message: err.message || 'Verification failed', type: 'error' }));
        }
    } finally {
        dispatch(setLoading(false));
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100 py-5">
      <Card className="auth-card p-4" style={{ maxWidth: '500px', width: '100%' }}>
        <Card.Body>
          <div className="text-center mb-4">
             <div className="d-flex justify-content-center mb-3">
              <Logo size={40} />
            </div>
            <h4 className="fw-bold text-secondary">Create Account</h4>
            <p className="text-muted small">Join ThesisTrack today</p>
          </div>

          {step === 'register' ? (
            <Form onSubmit={formik.handleSubmit}>
                <Form.Group className="mb-3" controlId="fullName">
                <Form.Label className="small fw-bold text-secondary">Full Name</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="John Doe"
                    {...formik.getFieldProps('fullName')}
                    isInvalid={formik.touched.fullName && formik.errors.fullName}
                    className="py-2"
                />
                <Form.Control.Feedback type="invalid">
                    {formik.errors.fullName}
                </Form.Control.Feedback>
                </Form.Group>

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

                <Form.Group className="mb-3" controlId="password">
                <Form.Label className="small fw-bold text-secondary">Password</Form.Label>
                <InputGroup hasValidation>
                    <Form.Control
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
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

                <Form.Group className="mb-4" controlId="role">
                <Form.Label className="small fw-bold text-secondary">I am a...</Form.Label>
                <Form.Select
                    {...formik.getFieldProps('role')}
                    isInvalid={formik.touched.role && formik.errors.role}
                    className="py-2"
                >
                    <option value="student">Student</option>
                    <option value="supervisor">Supervisor</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                    {formik.errors.role}
                </Form.Control.Feedback>
                </Form.Group>

                <Button 
                variant="primary" 
                type="submit" 
                className="w-100 mb-4 py-2 text-uppercase" 
                style={{ letterSpacing: '1px' }}
                >
                Sign Up
                </Button>

                <div className="text-center">
                <span className="text-muted small">Already have an account? </span>
                <Link to="/login" className="text-decoration-none fw-bold text-primary ms-1">Sign In</Link>
                </div>
            </Form>
          ) : (
             <Form onSubmit={handleVerifyOtp}>
                <div className="mb-4">
                    <Form.Label className="small fw-bold text-secondary">Verification Code</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="py-2 text-center letter-spacing-2"
                        style={{ letterSpacing: '4px', fontSize: '1.2rem' }}
                        maxLength={6}
                    />
                    <Form.Text className="text-muted">
                        Enter the code shown above (Dev Mode) or sent to your email.
                    </Form.Text>
                </div>

                <Button 
                variant="primary" 
                type="submit" 
                className="w-100 mb-3 py-2 text-uppercase" 
                >
                Verify & Create Account
                </Button>
                
                <Button 
                    variant="link" 
                    className="w-100 text-muted small text-decoration-none"
                    onClick={() => setStep('register')}
                >
                    Back to details
                </Button>
             </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Register;
