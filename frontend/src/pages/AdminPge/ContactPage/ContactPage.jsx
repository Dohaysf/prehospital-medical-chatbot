import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaTrash, FaEye, FaEnvelope, FaUser, FaCalendarAlt, FaSearch } from 'react-icons/fa';
import './ContactPage.css';

const ContactPage = () => {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/admin/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
      setFilteredMessages(res.data);
    } catch (err) {
      console.error('Erreur chargement messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMessages(messages);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = messages.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term) ||
        m.message.toLowerCase().includes(term)
      );
      setFilteredMessages(filtered);
    }
  }, [searchTerm, messages]);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce message ?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMessages();
      if (selectedMessage?._id === id) setSelectedMessage(null);
    } catch (err) {
      alert('Erreur suppression');
    }
  };

  const formatDate = (date) => new Date(date).toLocaleString();

  if (loading) return <div className="contact-admin-loading">Chargement des messages...</div>;

  return (
    <div className="contact-admin-page">
      <div className="contact-admin-header">
        <h1>📬 Messages de contact</h1>
        <p>Gérez les messages reçus depuis la page "À propos"</p>
      </div>

      <div className="contact-admin-controls">
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou contenu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="contact-admin-layout">
        {/* Liste des messages */}
        <div className="messages-list">
          {filteredMessages.length === 0 ? (
            <div className="no-messages">Aucun message trouvé</div>
          ) : (
            filteredMessages.map(msg => (
              <div
                key={msg._id}
                className={`message-card ${selectedMessage?._id === msg._id ? 'active' : ''}`}
                onClick={() => setSelectedMessage(msg)}
              >
                <div className="message-card-header">
                  <div className="message-name">
                    <FaUser /> {msg.name}
                  </div>
                  <div className="message-date">
                    <FaCalendarAlt /> {formatDate(msg.createdAt)}
                  </div>
                </div>
                <div className="message-email">
                  <FaEnvelope /> {msg.email}
                </div>
                <div className="message-preview">
                  {msg.message.substring(0, 80)}...
                </div>
                <button
                  className="delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDelete(msg._id); }}
                >
                  <FaTrash /> Supprimer
                </button>
              </div>
            ))
          )}
        </div>

        {/* Détail du message sélectionné */}
        <div className="message-detail">
          {selectedMessage ? (
            <>
              <h2>Détail du message</h2>
              <div className="detail-field">
                <strong>Nom :</strong> {selectedMessage.name}
              </div>
              <div className="detail-field">
                <strong>Email :</strong> {selectedMessage.email}
              </div>
              <div className="detail-field">
                <strong>Date :</strong> {formatDate(selectedMessage.createdAt)}
              </div>
              <div className="detail-field">
                <strong>Message :</strong>
                <div className="detail-message">{selectedMessage.message}</div>
              </div>
              <button
                className="reply-btn"
                onClick={() => window.location.href = `mailto:${selectedMessage.email}?subject=Réponse à votre message MedAssist`}
              >
                ✉️ Répondre
              </button>
            </>
          ) : (
            <div className="no-selection">Sélectionnez un message pour voir le détail</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactPage;