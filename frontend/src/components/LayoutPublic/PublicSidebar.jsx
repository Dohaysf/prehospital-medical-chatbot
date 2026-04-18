import { NavLink, useNavigate } from 'react-router-dom';
import { FaHome, FaComments, FaInfoCircle, FaUserPlus, FaSignInAlt } from 'react-icons/fa';
import './PublicSidebar.css';

const PublicSidebar = () => {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <aside className="public-sidebar">
      <div className="sidebar-logo">
        <h2>🏥 MedAssist</h2>
        <p>Espace public</p>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaHome className="nav-icon" />
          <span>Accueil</span>
        </NavLink>
        <NavLink to="/public/chat" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaComments className="nav-icon" />
          <span>Chat médical</span>
        </NavLink>
        <NavLink to="/public/about" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FaInfoCircle className="nav-icon" />
          <span>À propos</span>
        </NavLink>
      </nav>
      <div className="auth-section">
        {!isAuthenticated ? (
          <>
            <button onClick={() => navigate('/login')} className="auth-btn login-btn">
              <FaSignInAlt /> Se connecter
            </button>
            <button onClick={() => navigate('/register')} className="auth-btn register-btn">
              <FaUserPlus /> Créer un compte
            </button>
          </>
        ) : (
          <button onClick={() => navigate('/patient/chat')} className="auth-btn dashboard-btn">
            Accéder à mon espace
          </button>
        )}
      </div>
    </aside>
  );
};

export default PublicSidebar;