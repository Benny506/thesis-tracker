import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Container, Nav, Navbar, Dropdown } from 'react-bootstrap';
import { FaHome, FaBook, FaComments, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import Logo from '../../../components/common/Logo';
import { supabase } from '../../../lib/supabase';
import { useDispatch, useSelector } from 'react-redux';
import { setUnreadFromContext } from '../../../store/slices/unreadSlice';

const StudentLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const unreadCount = useSelector((state) => state.unread.totalComments);

  useEffect(() => {
    const fetchUnread = async () => {
      if (!user) {
        dispatch(setUnreadFromContext([]));
        return;
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single();

      if (projectError || !project) {
        dispatch(setUnreadFromContext([]));
        return;
      }

      const { data: chapters, error: chError } = await supabase
        .from('chapters')
        .select('id')
        .eq('project_id', project.id);

      if (chError || !chapters || chapters.length === 0) {
        dispatch(setUnreadFromContext([]));
        return;
      }

      const chapterIds = chapters.map((c) => c.id);

      const { data: unread, error: unreadError } = await supabase
        .from('chapter_comments_context')
        .select('id, chapter_id, created_at')
        .in('chapter_id', chapterIds)
        .eq('is_read', false);

      if (unreadError || !unread) {
        dispatch(setUnreadFromContext([]));
        return;
      }

      dispatch(setUnreadFromContext(unread));
    };

    fetchUnread();
  }, [user, location.pathname, dispatch]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="d-flex vh-100 bg-light">
      {/* Sidebar */}
      <div className="d-none d-md-flex flex-column flex-shrink-0 p-3 bg-white shadow-sm" style={{ width: '280px' }}>
        <div className="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-dark text-decoration-none">
           <div className="me-2"><Logo size={32} /></div>
        </div>
        <hr />
        <Nav className="flex-column mb-auto">
            <NavLink to="/student" end className={({ isActive }) => `nav-link mb-2 ${isActive ? 'active bg-warning text-dark fw-bold' : 'link-dark'}`}>
              <FaHome className="me-2" />
              Dashboard
            </NavLink>
            <NavLink to="/student/thesis" className={({ isActive }) => `nav-link mb-2 ${isActive ? 'active bg-warning text-dark fw-bold' : 'link-dark'}`}>
              <FaBook className="me-2" />
              My Thesis
              {unreadCount > 0 && (
                <span className="badge bg-danger ms-2">
                  {unreadCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/student/chat" className={({ isActive }) => `nav-link mb-2 ${isActive ? 'active bg-warning text-dark fw-bold' : 'link-dark'}`}>
              <FaComments className="me-2" />
              Chat
            </NavLink>
        </Nav>
        <hr />
        <Dropdown>
          <Dropdown.Toggle variant="light" id="dropdown-user" className="d-flex align-items-center w-100 text-start border-0">
             <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white me-2" style={{width: 32, height: 32}}>
                {user?.email?.charAt(0).toUpperCase()}
             </div>
             <div className="text-truncate flex-grow-1 small">{user?.email}</div>
          </Dropdown.Toggle>
          <Dropdown.Menu className="w-100 shadow">
            <Dropdown.Item onClick={() => navigate('/student/profile')}>
              <FaUser className="me-2" />Profile
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={handleSignOut} className="text-danger">
              <FaSignOutAlt className="me-2" />Sign out
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      {/* Main Content */}
      <div className="flex-grow-1 overflow-auto d-flex flex-column">
        {/* Mobile Header (visible only on small screens) */}
        <Navbar bg="white" expand="lg" className="d-md-none shadow-sm flex-shrink-0">
            <Container fluid>
                <Navbar.Brand href="#" className="d-flex align-items-center">
                    <Logo size={24} /> <span className="ms-2">ThesisTrack</span>
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="mobile-nav" />
                <Navbar.Collapse id="mobile-nav">
                    <Nav className="me-auto mt-2">
                        <Nav.Link as={NavLink} to="/student" end>Dashboard</Nav.Link>
                        <Nav.Link as={NavLink} to="/student/thesis">
                          My Thesis
                          {unreadCount > 0 && (
                            <span className="badge bg-danger ms-2">
                              {unreadCount}
                            </span>
                          )}
                        </Nav.Link>
                        <Nav.Link as={NavLink} to="/student/chat">Chat</Nav.Link>
                        <div className="dropdown-divider my-2"></div>
                        <Nav.Link onClick={handleSignOut} className="text-danger">Sign Out</Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
        
        <Container fluid className="p-4 flex-grow-1">
           <Outlet />
        </Container>
      </div>
    </div>
  );
};

export default StudentLayout;
