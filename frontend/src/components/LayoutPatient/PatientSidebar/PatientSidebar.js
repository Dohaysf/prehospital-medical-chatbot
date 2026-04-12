import { NavLink } from 'react-router-dom';
import { FaComments, FaUser, FaHistory, FaFileAlt, FaCog, FaSignOutAlt } from 'react-icons/fa';
import './PatientSidebar.css';

const PatientSidebar = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  };

  return (
    <aside className="patient-sidebar">
      <div className="patient-sidebar-logo">
        <h2>MedAssist</h2>
      </div>
      <nav className="patient-sidebar-nav">
        <NavLink to="/patient/chat" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaComments className="patient-nav-icon" />
          <span>Chat médical</span>
        </NavLink>
        <NavLink to="/patient/info" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaUser className="patient-nav-icon" />
          <span>Mes informations</span>
        </NavLink>
        <NavLink to="/patient/history" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaHistory className="patient-nav-icon" />
          <span>Historique</span>
        </NavLink>
        <NavLink to="/patient/eso" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaFileAlt className="patient-nav-icon" />
          <span>Mes résumés ESO</span>
        </NavLink>
        <NavLink to="/patient/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaCog className="patient-nav-icon" />
          <span>Paramètres</span>
        </NavLink>
        <button onClick={handleLogout} className="patient-logout-btn">
          <FaSignOutAlt /> Déconnexion
        </button>
      </nav>
    </aside>
  );
};

export default PatientSidebar;