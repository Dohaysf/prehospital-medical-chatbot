// frontend/src/pages/auth/Register.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('patient');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await axios.post('http://localhost:5000/api/auth/register', {
        email,
        password,
        name,
        role
      });
      setSuccess('Compte créé avec succès ! Veuillez vous connecter.');
      setTimeout(() => {
        navigate('/login', { state: { message: 'Inscription réussie. Connectez-vous.' } });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'inscription');
    }
  };

  return (
    <div className="auth-container">
      <h2>Inscription</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Nom complet" value={name} onChange={e => setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required />
        <div className="role-selector">
          <label><input type="radio" value="patient" checked={role === 'patient'} onChange={() => setRole('patient')} /> Patient</label>
          <label><input type="radio" value="manager" checked={role === 'manager'} onChange={() => setRole('manager')} /> Manager</label>
        </div>
        <button type="submit">S'inscrire</button>
      </form>
      <p>Déjà un compte ? <a href="/login">Se connecter</a></p>
    </div>
  );
};

export default Register;