import React, { useEffect, useState } from 'react';
import { Container, Card, Tabs, Tab, Button, Form } from 'react-bootstrap';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { supabase } from '../../../lib/supabase';
import { setLoading, showToast } from '../../../store/slices/uiSlice';

const StudentProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [fullName, setFullName] = useState('');
  const [matricNo, setMatricNo] = useState('');
  const [regNo, setRegNo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setMatricNo(profile?.matric_no || '');
    setRegNo(profile?.reg_no || '');
  }, [profile]);

  const handleResetPassword = () => {
    navigate('/forgot-password', { state: { email: user?.email || '' } });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    dispatch(setLoading({ isVisible: true, message: 'Updating profile...' }));
    try {
      const updates = {
        full_name: fullName || null,
        matric_no: matricNo || null,
        reg_no: regNo || null,
      };
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;
      if (typeof refreshProfile === 'function') {
        await refreshProfile();
      }
      dispatch(showToast({ message: 'Profile updated successfully', type: 'success' }));
    } catch (err) {
      dispatch(
        showToast({
          message: err.message || 'Failed to update profile',
          type: 'error',
        })
      );
    } finally {
      setSaving(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <Container fluid className="py-4">
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white">
          <h4 className="mb-0 fw-bold">My Profile</h4>
        </Card.Header>
        <Card.Body>
          <Tabs defaultActiveKey="personal" className="mb-3">
            <Tab eventKey="personal" title="Personal Info">
              <div className="row gy-3">
                <div className="col-12 col-md-6 col-xl-4">
                  <Form.Group>
                    <Form.Label className="small text-muted">Full Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </Form.Group>
                </div>
                <div className="col-12 col-md-6 col-xl-4">
                  <Form.Group>
                    <Form.Label className="small text-muted">Matric No</Form.Label>
                    <Form.Control
                      type="text"
                      value={matricNo}
                      onChange={(e) => setMatricNo(e.target.value)}
                    />
                  </Form.Group>
                </div>
                <div className="col-12 col-md-6 col-xl-4">
                  <Form.Group>
                    <Form.Label className="small text-muted">Reg No</Form.Label>
                    <Form.Control
                      type="text"
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                    />
                  </Form.Group>
                </div>
                <div className="col-12 col-md-6 col-xl-4">
                  <Form.Group>
                    <Form.Label className="small text-muted">Role</Form.Label>
                    <Form.Control
                      type="text"
                      value={profile?.role || 'student'}
                      readOnly
                    />
                  </Form.Group>
                </div>
              </div>
            </Tab>
            <Tab eventKey="security" title="Security">
              <div className="row gy-3">
                <div className="col-12 col-md-6 col-xl-4">
                  <Form.Group>
                    <Form.Label className="small text-muted">Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={user?.email || ''}
                      readOnly
                    />
                  </Form.Group>
                </div>
                <div className="col-12 mt-2">
                  <p className="small text-muted mb-2">
                    Use the button below to reset your password securely.
                  </p>
                  <Button variant="outline-primary" onClick={handleResetPassword}>
                    Reset Password
                  </Button>
                </div>
              </div>
            </Tab>
          </Tabs>
          <div className="mt-3">
            <Button
              variant="primary"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default StudentProfile;
