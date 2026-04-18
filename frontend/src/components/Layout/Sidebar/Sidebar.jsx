import { NavLink } from 'react-router-dom';
import { FaComments, FaHistory, FaChartBar, FaCog, FaHospitalUser, FaSignOutAlt, FaEnvelope } from 'react-icons/fa'; // ← ajout de FaEnvelope
import './Sidebar.css';

const Sidebar = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <FaHospitalUser className="logo-icon" />
        <h2>MedAssist</h2>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/manager/chat" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaComments className="nav-icon" />
          <span>Chat</span>
        </NavLink>
        <NavLink to="/manager/history" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaHistory className="nav-icon" />
          <span>Historique</span>
        </NavLink>
        <NavLink to="/manager/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaChartBar className="nav-icon" />
          <span>Statistiques</span>
        </NavLink>
        {/* NOUVEAU LIEN VERS LA PAGE CONTACTS */}
        <NavLink to="/manager/contacts" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaEnvelope className="nav-icon" />
          <span>Messages reçus</span>
        </NavLink>
        <NavLink to="/manager/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaCog className="nav-icon" />
          <span>Paramètres</span>
        </NavLink>
        <button onClick={handleLogout} className="logout-btn">
          <FaSignOutAlt className="nav-icon" />
          <span>Déconnexion</span>
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;