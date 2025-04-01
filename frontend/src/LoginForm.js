import React, { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }

    return result;
}

const SIMPLE_LOGIN_FORM = true;
const SHOW_HOST_TOKEN = false;

function LoginForm({ onLogin }) {

    const [userToken, setUserToken] = useState('');
    const [gameToken, setGameToken] = useState('10001');
    const [numRounds, setNumRounds] = useState(8);
    const [hostName, setHostName] = useState('');
    const [playerName, setPlayerName] = useState(generateRandomString(5));
    const [hostEmail, setHostEmail] = useState('');

    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let userTokenToUse = userToken;

            if (SIMPLE_LOGIN_FORM) {
                if (!userTokenToUse && hostName) {
                    userTokenToUse = generateRandomString(10);
                }
            }
            const response = await axios.post('/auth', {
                token: userTokenToUse,
                player_data: {
                    name: playerName,
                    game_token: gameToken,
                },
                user_data: {
                    name: hostName,
                    email: hostEmail,
                    rounds_num: numRounds,
                    simple_game_start: SIMPLE_LOGIN_FORM,
                },
            });

            const { token } = response.data;
            Cookies.set('authToken', token);
            sessionStorage.setItem('authToken', token);
            onLogin({ startGame: SIMPLE_LOGIN_FORM, numRounds: numRounds });
        } catch (err) {

            setError('Invalid credentials: ' + err.message);

        }
    };

    return (
        <div class="parent">
            <form class="login-form" onSubmit={handleSubmit}>
                <div>
                    <h2>Начать Новую Игру</h2>
                    {(!SIMPLE_LOGIN_FORM || SHOW_HOST_TOKEN) && (
                        <input
                            type="text"
                            value={userToken}
                            onChange={(e) => setUserToken(e.target.value)}
                            placeholder="Enter User Token"
                        />
                    )}
                    <input
                        type="text"
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        placeholder="Имя Ведущего"
                    />
                    {!SIMPLE_LOGIN_FORM && (
                        <input
                            type="email"
                            value={hostEmail}
                            onChange={(e) => setHostEmail(e.target.value)}
                            placeholder="Email"
                        />
                    )}
                    <input
                        type="text"
                        value={numRounds}
                        onChange={(e) => setNumRounds(e.target.value)}
                        placeholder="Количество тем"
                    />
                    <button type="submit">Start Game</button>
                </div>

                <div>
                    <h2>Присоединиться к игре</h2>
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Имя Игрока"
                    />
                    <input
                        type="text"
                        value={gameToken}
                        onChange={(e) => setGameToken(e.target.value)}
                        placeholder="Токен Игры"
                    />
                    <button type="submit">Присоединиться</button>
                </div>

                <div>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                </div>
            </form>
        </div>
    );
}

export default LoginForm;