import React, { useEffect } from 'react';
import Header from './Header/Header';
import Sidebar from './Sidebar/Sidebar';
import './Layout.css';

const Layout = ({ children }) => {
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="page-container">{children}</div>
      </div>
    </div>
  );
};

export default Layout;