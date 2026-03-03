import React from 'react';
import Chat from './components/Chat/Chat';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Assistant Médical Pré-Hospitalier</h1>
      </header>
      <main>
        <Chat />
      </main>
    </div>
  );
}

export default App;