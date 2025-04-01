import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

import { useTranslation } from "react-i18next";
import "./i18n"; // Import i18n initialization

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

function LoginForm({ onLogin }) {
    const { t, i18n } = useTranslation(); // Hook for translations

    const [userToken, setUserToken] = useState('');
    const [gameToken, setGameToken] = useState('10001');
    const [numRounds, setNumRounds] = useState(8);
    const [hostName, setHostName] = useState('');
    const [playerName, setPlayerName] = useState(generateRandomString(5));
    const [hostEmail, setHostEmail] = useState('');



    const [error, setError] = useState('');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('user_token')) {
            setUserToken(urlParams.get('user_token'));
        }
        if (urlParams.get('game_token')) {
            setGameToken(urlParams.get('game_token'));
        }
    }, []);


    const handleSubmit = async (e, isHost, startGame) => {
        e.preventDefault();
        try {
            let userTokenToUse = userToken;

            if (SIMPLE_LOGIN_FORM) {
                if (!userTokenToUse && isHost) {
                    userTokenToUse = generateRandomString(10);
                }
            }
            const request = {
                token: userTokenToUse
            }
            if (isHost) {
                let hostNameToUse = hostName;
                if (SIMPLE_LOGIN_FORM && !hostNameToUse) {
                    hostNameToUse = "Ведущий";
                }
                request.user_data = {
                    name: hostNameToUse,
                    email: hostEmail,
                    rounds_num: numRounds,
                    simple_game_start: startGame,
                };
            } else {
                request.player_data = {
                    name: playerName,
                    game_token: gameToken,
                };
            }
            const response = await axios.post('/auth', request);



            const { token } = response.data;
            Cookies.set('authToken', token);
            sessionStorage.setItem('authToken', token);
            onLogin({ startGame: startGame, numRounds: numRounds });
        } catch (err) {

            setError('Invalid credentials: ' + err.message);

        }
    };

    const handleSubmitHostStart = async (e) => {
        handleSubmit(e, true, true);
    }
    const handleSubmitHost = async (e) => {
        handleSubmit(e, true, false);
    }
    const handleSubmitPlayer = async (e) => {
        handleSubmit(e, false, true);
    }

    const handleLanguageChange = (lang) => {
        i18n.changeLanguage(lang); // Change language dynamically
    };

    return (

        <div class="parent">
            {false && (
                <div>
                    <button onClick={() => handleLanguageChange("en")}>English</button>
                    <button onClick={() => handleLanguageChange("ru")}>Русский</button>
                </div>
            )}
            <form class="login-form">
                <div>
                    <h2>{t("host")}</h2>
                    <input
                        type="text"
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        placeholder={t("hostNamePlaceholder")}
                    />
                    {!SIMPLE_LOGIN_FORM && (
                        <input
                            type="email"
                            value={hostEmail}
                            onChange={(e) => setHostEmail(e.target.value)}
                            placeholder={t("hostEmailPlaceholder")}
                        />
                    )}
                    <input
                        type="text"
                        value={numRounds}
                        onChange={(e) => setNumRounds(e.target.value)}
                        placeholder={t("numRoundsPlaceholder")}
                    />
                    <button onClick={handleSubmitHostStart}>{t("startNewGame")}</button>
                    <h3>{t("hostCabinet")}</h3>
                    <input
                        type="text"
                        value={userToken}
                        onChange={(e) => setUserToken(e.target.value)}
                        placeholder={t("hostCodePlaceholder")}
                    />
                    <button onClick={handleSubmitHost}>{t("goToGameSelection")}</button>
                </div>

                <div>
                    <h2>{t("player")}</h2>
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder={t("playerNamePlaceholder")}
                    />
                    <input
                        type="text"
                        value={gameToken}
                        onChange={(e) => setGameToken(e.target.value)}
                        placeholder={t("gameTokenPlaceholder")}
                    />
                    <button onClick={handleSubmitPlayer}>{t("joinGame")}</button>
                </div>

                <div>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                </div>
            </form>
        </div>
    );
}

export default LoginForm;