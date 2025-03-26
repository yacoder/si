import React, { useState, useEffect } from 'react';
import './App.css';

import LoginForm from './LoginForm';
import Cookies from 'js-cookie';

import SetData from './ComponentSetData';
import GetData from './ComponentGetData';

function App() {
  const [activeTab, setActiveTab] = useState('prepare');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = Cookies.get('authToken');
    const sessionToken = sessionStorage.getItem('authToken');
    if (token && token === sessionToken) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };
  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <header className="App-header">
        <div>
          <button onClick={() => setActiveTab('setdata')}>Set Data</button>
          <button onClick={() => setActiveTab('getdata')}>Get Data</button>
        </div>
        {activeTab === 'setdata' && <SetData />}
        {activeTab === 'getdata' && <GetData />}
      </header>
    </div>
  );
}

export default App;
