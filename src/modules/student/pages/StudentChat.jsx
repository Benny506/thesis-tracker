import { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import OneToOneChat from '../../../components/chat/OneToOneChat';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../store/slices/uiSlice';

const StudentChat = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [peerUserId, setPeerUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPeer = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select(
            `
            id,
            status,
            supervisor:supervisor_id (
              id,
              full_name
            )
          `
          )
          .eq('student_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
          setPeerUserId(null);
          return;
        }
        const activeProject =
          data.find((p) => p.status === 'active') ||
          data.find((p) => p.status === 'completed') ||
          data[0];
        setPeerUserId(activeProject?.supervisor?.id || null);
      } catch (err) {
        dispatch(
          showToast({
            message: err.message || 'Failed to load chat supervisor',
            type: 'error',
          })
        );
      } finally {
        setLoading(false);
      }
    };
    fetchPeer();
  }, [user, dispatch]);

  return (
    <div className="container py-3">
      <h2 className="mb-3">Chat</h2>
      <div style={{ height: '70vh' }}>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center h-100">
            <Spinner animation="border" />
          </div>
        ) : peerUserId ? (
          <OneToOneChat peerUserId={peerUserId} peerLabel="Supervisor" />
        ) : (
          <div className="h-100 d-flex justify-content-center align-items-center text-muted small">
            No active supervisor found for chat yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentChat;
