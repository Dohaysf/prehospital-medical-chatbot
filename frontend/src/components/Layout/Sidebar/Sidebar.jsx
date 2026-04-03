import { NavLink } from 'react-router-dom';
import { FaComments, FaHistory, FaChartBar, FaCog, FaHospitalUser } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <FaHospitalUser className="logo-icon" />
        <h2>MedAssist</h2>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaComments className="nav-icon" />
          <span>Chat</span>
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaHistory className="nav-icon" />
          <span>Historique</span>
        </NavLink>
        <NavLink to="/statistics" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaChartBar className="nav-icon" />
          <span>Statistiques</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaCog className="nav-icon" />
          <span>Paramètres</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;