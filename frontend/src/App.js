import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ChatPage from './pages/ChatPage/ChatPage';
import HistoryPage from './pages/HistoryPage/HistoryPage';
import StatisticsPage from './pages/StatisticsPage/StatisticsPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import PatientLayout from './components/LayoutPatient/PatientLayout/PatientLayout'; 
import PatientInfo from './pages/PatientPage/PatientInfo/PatientInfo';
import PatientHistory from './pages/PatientPage/PatientHistory/PatientHistory';
import PatientESO from './pages/PatientPage/PatientESO/PatientESO';
import PatientChat from './pages/PatientPage/PatientChat/PatientChat'; // Ajout
import PrivateRoute from './components/PrivateRoute';
import './App.css';
import PatientSettings from './pages/PatientPage/PatientSettings/PatientSettings';

function App() {
  const role = localStorage.getItem('userRole');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Patient routes */}
        <Route path="/patient/chat" element={
          <PrivateRoute allowedRoles={['patient']}>
            <PatientLayout><PatientChat /></PatientLayout>
          </PrivateRoute>
        } />
        <Route path="/patient/info" element={
          <PrivateRoute allowedRoles={['patient']}>
            <PatientLayout><PatientInfo /></PatientLayout>
          </PrivateRoute>
        } />
        <Route path="/patient/history" element={
          <PrivateRoute allowedRoles={['patient']}>
            <PatientLayout><PatientHistory /></PatientLayout>
          </PrivateRoute>
        } />
        <Route path="/patient/eso" element={
          <PrivateRoute allowedRoles={['patient']}>
            <PatientLayout><PatientESO /></PatientLayout>
          </PrivateRoute>
        } />
        <Route path="/patient/settings" element={
           <PrivateRoute allowedRoles={['patient']}>
           <PatientLayout><PatientSettings /></PatientLayout>
        </PrivateRoute>
        } />

        {/* Manager routes */}
        <Route path="/manager/dashboard" element={
          <PrivateRoute allowedRoles={['manager']}>
            <Layout><StatisticsPage /></Layout>
          </PrivateRoute>
        } />
        <Route path="/manager/chat" element={
          <PrivateRoute allowedRoles={['manager']}>
            <Layout><ChatPage /></Layout>
          </PrivateRoute>
        } />
        <Route path="/manager/history" element={
          <PrivateRoute allowedRoles={['manager']}>
            <Layout><HistoryPage /></Layout>
          </PrivateRoute>
        } />
        <Route path="/manager/settings" element={
          <PrivateRoute allowedRoles={['manager']}>
            <Layout><SettingsPage /></Layout>
          </PrivateRoute>
        } />

        {/* Redirection par défaut */}
        <Route path="/" element={<Navigate to={role === 'manager' ? '/manager/dashboard' : '/patient/chat'} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;