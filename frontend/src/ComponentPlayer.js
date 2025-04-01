// src/PrepareDataBasedOnURL.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import callAPI from './callAPI';

import { useTranslation } from "react-i18next";
import "./i18n"; // Import i18n initialization

import { handlePlayerLoop } from "./gameFlow";
import RoundStatsTable from "./RoundStatsTable";

const POSSIBLE_STATES = {
    AUTO_JOIN: 'AUTO_JOIN',
    NOT_EXIST: 'NOT_EXIST',
    CREATED: 'CREATED',
    STARTED: 'STARTED',
    ENDED: 'ENDED'

}

function ComponentPlayer({ startGame }) {
    const { t, i18n } = useTranslation(); // Hook for translations

    const [gameState, setGameState] = useState(startGame ? POSSIBLE_STATES.AUTO_JOIN : POSSIBLE_STATES.NOT_EXIST);
    const [gameID, setGameID] = useState(null);
    const [savedPlayer, setSavedPlayer] = useState(null);
    const [gameStatus, setGameStatus] = useState(null);
    const [lag, setLag] = useState(0);
    const [gameName, setGameName] = useState("");
    const [currentNominal, setCurrentNominal] = useState(null);

    const [loading, setLoading] = useState(false);

    const handleLanguageChange = (lang) => {
        i18n.changeLanguage(lang); // Change language dynamically
    };

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await callAPI(`/api/player/game`);
            if (data && data.status?.game_id) {
                setGameID(data.status.game_id);
                setGameName(data.status.game_token);
                setCurrentNominal(data.status.nominal);
                setSavedPlayer(data.player);

                if (startGame) {
                    console.log("Attempting to auto-join");
                    setGameState(POSSIBLE_STATES.AUTO_JOIN);
                    messanger.current = handlePlayerLoop(data.player.name, data.status.game_id, handleSetGameStatus, data.player.player_id,
                        window.location.href
                    );
                } else {
                    setGameState(POSSIBLE_STATES.CREATED);
                }
            } else {
                setGameState(POSSIBLE_STATES.NOT_EXIST);

            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [startGame]);

    const messanger = useRef(null);



    useEffect(() => {
        const fetchInitialData = async () => loadData();
        fetchInitialData();
    }, [loadData]);

    const handleSetGameStatus = (status) => {
        setGameState(POSSIBLE_STATES.STARTED)
        setGameStatus(status);
        if (status?.nominal) {
            setCurrentNominal(status.nominal);
        }

    }



    const handleJoinGame = async (event) => {
        event?.preventDefault();

        if (!savedPlayer?.player_id || !savedPlayer?.name) {
            console.log("Player ID or name is not available...");
            return;
        }


        messanger.current = handlePlayerLoop(savedPlayer.name, gameID, handleSetGameStatus, savedPlayer.player_id, window.location.href);
    }


    const sendMessage = useCallback((message) => {
        if (messanger.current) {
            message.game_id = gameID;
            messanger.current(message);
        } else {
            console.error('Messanger is not initialized yet.');
        }
    }, [gameID, messanger]);




    const logout = () => {
        // Clear the token and redirect to login page
        sessionStorage.removeItem('authToken');
        window.location.reload();
    }




    return (
    <div>
        <div className="top-bar">
            <button onClick={logout} className="leave-button">Выйти из игры</button>
            <span>⏳ Lag: {lag.toFixed(2)} ms</span>
            <span>🎮 Токен игры: {gameName}</span>
        </div>

        <div>
            {false && (
                <div>
                    <button onClick={() => handleLanguageChange("en")}>English</button>
                    <button onClick={() => handleLanguageChange("ru")}>Русский</button>
                </div>
            )}
            {gameState === POSSIBLE_STATES.NOT_EXIST && <button onClick={() => logout()}>{t("somethingBroke")}</button>}
            {gameState === POSSIBLE_STATES.CREATED && (
                <div>
                    <button onClick={handleJoinGame}>{t("reconnect")}</button>
                    <button onClick={logout}>{t("logout")}</button>
                </div>
            )}

            {gameState === POSSIBLE_STATES.STARTED && (
                <div>
                    <h2>Тема: {gameStatus?.round_number}: {gameStatus?.round_name} Вопрос: {currentNominal}</h2>
                    {gameStatus?.question_state === "fake" && (
                        <div>
                            <p>Game Status: {JSON.stringify(gameStatus)}</p>
                        </div>
                    )}

                    {gameStatus?.question_state === "running" && (


                        <div>

                            <RoundStatsTable data={gameStatus.current_round_stats}
                                number_of_question_in_round={gameStatus.number_of_question_in_round}
                                nominals={gameStatus.nominals}
                            />

                            <button class="round-button" onClick={() => sendMessage({
                                action: "signal",
                                player_id: savedPlayer.player_id,
                                local_ts: Date.now(),

                            })}> {gameStatus.time_left < 5 ? gameStatus.time_left : "Тыц!"}</button>
                        </div>
                    )}



                </div>)}






            {loading && <p>{t("loading")}</p>}


        </div>
     </div>
    );
}

export default ComponentPlayer;