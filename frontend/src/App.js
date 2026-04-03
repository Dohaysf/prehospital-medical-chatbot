import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ChatPage from './pages/ChatPage/ChatPage';
import HistoryPage from './pages/HistoryPage/HistoryPage';
import StatisticsPage from './pages/StatisticsPage/StatisticsPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;