import { useEffect, useState } from 'react';
import { Spinner, ListGroup, Form } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import OneToOneChat from '../../../components/chat/OneToOneChat';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../store/slices/uiSlice';

const SupervisorChat = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [students, setStudents] = useState([]);
  const [peerUserId, setPeerUserId] = useState(null);
  const [peerLabel, setPeerLabel] = useState('Student');
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
            student:student_id (
              id,
              full_name
            )
          `
          )
          .eq('supervisor_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
          setStudents([]);
          setPeerUserId(null);
          setPeerLabel('Student');
          return;
        }

        const studentMap = {};
        data.forEach((p) => {
          if (p.student && p.student.id && !studentMap[p.student.id]) {
            studentMap[p.student.id] = {
              id: p.student.id,
              name: p.student.full_name || 'Student',
            };
          }
        });
        const uniqueStudents = Object.values(studentMap);
        setStudents(uniqueStudents);

        let defaultStudent = null;
        const activeProject =
          data.find((p) => p.status === 'active') ||
          data.find((p) => p.status === 'completed') ||
          data[0];
        if (activeProject && activeProject.student && activeProject.student.id) {
          defaultStudent = {
            id: activeProject.student.id,
            name: activeProject.student.full_name || 'Student',
          };
        } else if (uniqueStudents.length > 0) {
          defaultStudent = uniqueStudents[0];
        }

        if (defaultStudent) {
          setPeerUserId(defaultStudent.id);
          setPeerLabel(defaultStudent.name);
        } else {
          setPeerUserId(null);
          setPeerLabel('Student');
        }
      } catch (err) {
        dispatch(
          showToast({
            message: err.message || 'Failed to load chat student',
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
        ) : students.length === 0 ? (
          <div className="h-100 d-flex justify-content-center align-items-center text-muted small">
            No active student found for chat yet.
          </div>
        ) : (
          <div className="d-flex h-100">
            <div className="d-none d-md-flex flex-column border-end pe-2" style={{ width: 260 }}>
              <div className="fw-semibold mb-2">Students</div>
              <ListGroup variant="flush" className="flex-grow-1 overflow-auto">
                {students.map((s) => (
                  <ListGroup.Item
                    key={s.id}
                    action
                    active={s.id === peerUserId}
                    onClick={() => {
                      setPeerUserId(s.id);
                      setPeerLabel(s.name);
                    }}
                    className="small"
                  >
                    {s.name}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
            <div className="flex-grow-1 ms-md-3 d-flex flex-column">
              <div className="mb-2 d-md-none">
                <Form.Select
                  size="sm"
                  value={peerUserId || ''}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    const sel = students.find((s) => s.id === id) || null;
                    setPeerUserId(sel ? sel.id : null);
                    setPeerLabel(sel ? sel.name : 'Student');
                  }}
                >
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <div className="flex-grow-1">
                {peerUserId ? (
                  <OneToOneChat peerUserId={peerUserId} peerLabel={peerLabel} />
                ) : (
                  <div className="h-100 d-flex justify-content-center align-items-center text-muted small">
                    Select a student to start chatting.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorChat;
