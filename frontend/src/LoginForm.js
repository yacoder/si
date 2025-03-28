import React, { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

function LoginForm({ onLogin }) {
    const [userToken, setUserToken] = useState('');
    const [gameToken, setGameToken] = useState('');
    const [hostName, setHostName] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [hostEmail, setHostEmail] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/auth', {
                token: userToken,
                player_data: {
                    name: playerName,
                    game_token: gameToken,
                },
                user_data: {
                    name: hostName,
                    email: hostEmail,
                },
            });
            const { token } = response.data;
            Cookies.set('authToken', token);
            sessionStorage.setItem('authToken', token);
            onLogin();
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Login As Host</h2>
            <input
                type="password"
                value={userToken}
                onChange={(e) => setUserToken(e.target.value)}
                placeholder="Enter User Token"
            />
            <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="If first login: Enter Host Name"
            />
            <input
                type="email"
                value={hostEmail}
                onChange={(e) => setHostEmail(e.target.value)}
                placeholder="If first login: Enter Host Email"
            />
            <button type="submit">Login</button>
            <h2>Login As Player</h2>
            <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter Player Name"
            />
            <input
                type="password"
                value={gameToken}
                onChange={(e) => setGameToken(e.target.value)}
                placeholder="Enter Game Token"
            />
            <button type="submit">Login</button>
            {error && <p>{error}</p>}
        </form>
    );
}

export default LoginForm;