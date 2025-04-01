import React, { useState, useEffect } from 'react';
import './App.css';

import LoginForm from './LoginForm';
import StartGame from './StartGame';
import Cookies from 'js-cookie';


import ComponentHost from './ComponentHost';
import ComponentPlayer from './ComponentPlayer';


function App() {
  const [activeTab, setActiveTab] = useState('prepare');
  const [isPlayer, setIsPlayer] = useState(false);
  const [startGame, setStartGame] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedNewGameSettings, setSavedNewGameSettings] = useState({
    numRounds: 8,
    roundNames: "",
  });

  const setDataBasedOnToken = ({ startGame, newGameSettings }) => {
    const token = Cookies.get('authToken');
    const sessionToken = sessionStorage.getItem('authToken');
    if (token && token === sessionToken) {
      if (token.startsWith('player') || token.startsWith('transient')) {
        setIsPlayer(true);
        setActiveTab('player');
      } else {
        setIsPlayer(false);
        setActiveTab('host');
        setSavedNewGameSettings(newGameSettings);

      }
      setStartGame(startGame);

      setIsAuthenticated(true);
    }
  }

  useEffect(() => {
    setDataBasedOnToken({});

  }, []);

  const handleLogin = (startupParams) => {
    setDataBasedOnToken(startupParams);

  };
  if (!isAuthenticated) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug')) {
      return <StartGame />;
    } else {
      return <LoginForm onLogin={handleLogin} />;
    }
  }

  return (
    <div className="App">
      <header className="App-header">


        {!isPlayer && activeTab === 'host' && <ComponentHost startGame={startGame} newGameSettings={savedNewGameSettings} />}
        {isPlayer && activeTab === 'player' && <ComponentPlayer />}

      </header>
    </div>
  );
}

export default App;
