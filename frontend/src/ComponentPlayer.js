// src/PrepareDataBasedOnURL.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import callAPI from './callAPI';

import { useTranslation } from "react-i18next";
import "./i18n"; // Import i18n initialization

import { handlePlayerLoop, performStatusUpdate } from "./gameFlow";
import RoundStatsTable from "./RoundStatsTable";
import GameStatsDisplay from "./GameStatsDisplay";

const POSSIBLE_STATES = {
    AUTO_JOIN: 'AUTO_JOIN',
    NOT_EXIST: 'NOT_EXIST',
    CREATED: 'CREATED',
    STARTED: 'STARTED',
    ENDED: 'ENDED'

}

function ComponentPlayer() {
    const { t, i18n } = useTranslation(); // Hook for translations

    const [gameState, setGameState] = useState(POSSIBLE_STATES.AUTO_JOIN);
    const [savedPlayer, setSavedPlayer] = useState(null);
    const [gameStatus, setGameStatus] = useState({});

    const currentGameID = useRef(null); // Ref to store the current game ID
    const messanger = useRef(null);

    const [loading, setLoading] = useState(false);

    const handleLanguageChange = (lang) => {
        i18n.changeLanguage(lang); // Change language dynamically
    };

    const safeSetGameStatus = (propsedNewStatus) => {
        setGameStatus((prevStatus) => ({
            ...prevStatus,
            ...propsedNewStatus
        }));
    };

    const handleSetGameStatus = (status) => {
        setGameState(POSSIBLE_STATES.STARTED);
        performStatusUpdate({
            status: status,
            setGameStatus: safeSetGameStatus,
            ignoreGameCheck: true,
            // reloadGameStatus: () => loadData(),
        });
    };


    // call loadData when the component mounts
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                console.log("Loading data...");
                const data = await callAPI(`/api/player/game`);
                if (data && data.status?.game_id) {
                    currentGameID.current = data.status.game_id;
                    setSavedPlayer(data.player);
                    setGameState(POSSIBLE_STATES.AUTO_JOIN);
                    messanger.current = handlePlayerLoop(data.player.name, data.status.game_id, handleSetGameStatus, data.player.player_id,
                        window.location.href
                    );

                } else {
                    setGameState(POSSIBLE_STATES.NOT_EXIST);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);



    const handleJoinGame = async (event) => {
        event?.preventDefault();

        if (!savedPlayer?.player_id || !savedPlayer?.name) {
            console.log("Player ID or name is not available...");
            return;
        }


        messanger.current = handlePlayerLoop(savedPlayer.name, currentGameID.current, handleSetGameStatus, savedPlayer.player_id, window.location.href);
    }


    const sendMessage = useCallback((message) => {
        if (messanger.current) {
            message.game_id = currentGameID.current;
            messanger.current(message);
        } else {
            console.error('Messanger is not initialized yet.');
        }
    }, [currentGameID, messanger]);




    const logout = () => {
        // Clear the token and redirect to login page
        sessionStorage.removeItem('authToken');
        window.location.reload();
    }




    return (
        <div>
            {false && (
                <div>
                    <button onClick={() => handleLanguageChange("en")}>English</button>
                    <button onClick={() => handleLanguageChange("ru")}>Русский</button>
                </div>
            )}
            <div className="top-bar">
                <button onClick={logout} className="leave-button">{t("logoutPlayer")}</button>
                <GameStatsDisplay t={t} gameStats={gameStatus} />
            </div>

            <div>

                {gameState === POSSIBLE_STATES.NOT_EXIST && <button onClick={() => logout()}>{t("somethingBroke")}</button>}
                {(gameState === POSSIBLE_STATES.CREATED || gameState === POSSIBLE_STATES.AUTO_JOIN) && (
                    <div>
                        <button onClick={handleJoinGame}>{t("reconnect")}</button>

                    </div>
                )}

                {gameState === POSSIBLE_STATES.STARTED && (
                    <div>
                        <h2>{t("round")}: {gameStatus?.round_number}: {gameStatus?.round_name} {t("question")}: {gameStatus?.currentNominal}</h2>
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