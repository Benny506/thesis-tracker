import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Container, Nav, Navbar, Dropdown } from 'react-bootstrap';
import { FaHome, FaClipboardList, FaComments, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import Logo from '../../../components/common/Logo';

const SupervisorLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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
            <NavLink to="/supervisor" end className={({ isActive }) => `nav-link mb-2 ${isActive ? 'active bg-primary text-white fw-bold' : 'link-dark'}`}>
              <FaHome className="me-2" />
              Dashboard
            </NavLink>
            <NavLink to="/supervisor/projects" className={({ isActive }) => `nav-link mb-2 ${isActive ? 'active bg-primary text-white fw-bold' : 'link-dark'}`}>
              <FaClipboardList className="me-2" />
              Projects
            </NavLink>
            <NavLink to="/supervisor/chat" className={({ isActive }) => `nav-link mb-2 ${isActive ? 'active bg-primary text-white fw-bold' : 'link-dark'}`}>
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
            <Dropdown.Item href="#/profile"><FaUser className="me-2" />Profile</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={handleSignOut} className="text-danger"><FaSignOutAlt className="me-2" />Sign out</Dropdown.Item>
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
                        <Nav.Link as={NavLink} to="/supervisor" end>Dashboard</Nav.Link>
                        <Nav.Link as={NavLink} to="/supervisor/projects">Projects</Nav.Link>
                        <Nav.Link as={NavLink} to="/supervisor/chat">Chat</Nav.Link>
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

export default SupervisorLayout;