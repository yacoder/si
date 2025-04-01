import React, { useState, useEffect, useCallback, useRef } from 'react';

import { useTranslation } from "react-i18next";
import "./i18n"; // Import i18n initialization

import callAPI from './callAPI';
import { handleLoop as handleHostLoop } from "./gameFlow";
import RoundStatsTable from "./RoundStatsTable";

const POSSIBLE_STATES = {
    AUTO_START: 'AUTO_START',
    NOT_EXIST: 'NOT_EXIST',
    STARTED: 'STARTED',
    ENDED: 'ENDED'

}



function ComponentHost({ startGame, autostartNumRounds }) {
    const { t, i18n } = useTranslation(); // Hook for translations

    const [gameState, setGameState] = useState(startGame ? POSSIBLE_STATES.AUTO_START : POSSIBLE_STATES.NOT_EXIST);
    const [loading, setLoading] = useState(false);


    const [name, setName] = useState(t("defaultGameName")); // Name input value (default: AAA)
    const [hostData, setHostData] = useState(null); // Stores host data from the WebSocket
    const [gameStatus, setGameStatus] = useState(null); // Stores game status updates from the WebSocket
    const [clientServerLag, setClientServerLag ] = useState(0);
    const [serverClientLag, setServerClientLag ] = useState(0);
    const [reconnectGameID, setReconnectGameID] = useState(null); // Stores game ID for reconnection
    const [gameID, setGameID] = useState(null); // Stores game ID for reconnection
    const [numRounds, setNumRounds] = useState(autostartNumRounds); // Number of rounds for the game
    const [roundNames, setRoundNames] = useState(""); // Stores topics for the game
    const [showRoundNameEdits, setShowRoundNameEdits] = useState(false); // Flag to show/hide round name edits


    const handleLanguageChange = (lang) => {
        i18n.changeLanguage(lang); // Change language dynamically
    };


    const switchStatus = (status) => {
        if (status === 'host') {
            setGameState(POSSIBLE_STATES.STARTED);
        }
    };
    const switchGameStatus = (status) => {
        if (status === "OK") {
            reloadGameStatus();
        } else {
            setGameStatus(status);
            if (status?.game_id) {
                setGameID(status.game_id);
            }
        }
    };
    const messanger = useRef(null);


    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleCreateGame = async () => {
        try {
            const data = await callAPI(`/api/host`);
            const hostID = data.id;
            console.log("Host ID:", hostID);
            const messanger_handler = handleHostLoop(name, setHostData, switchStatus, switchGameStatus, 'start', hostID, null,
                { number_of_rounds: numRounds, round_names: roundNames },
                window.location.href
            );
            messanger.current = messanger_handler; // Save the messanger function to state

        } catch (error) {
            console.error('Error setting data:', error);
        }
    }

    const handleReconnectGame = async (event) => {
        try {
            const data = await callAPI(`/api/host/game/${reconnectGameID}`);
            if (data && data.status?.game_id) {
                setGameID(data.status.game_id);
                setGameStatus(data.status);
                const messanger_handler = handleHostLoop(name, setHostData, switchStatus, switchGameStatus, 'reconnect', null, reconnectGameID,
                    {},
                    window.location.href
                )
                messanger.current = messanger_handler; // Save the messanger function to state
            }
        } catch (error) {
            console.error('Error setting data:', error);
        }
    }

    const reloadGameStatus = async () => {
        setLoading(true);
        try {
            if (gameID) {
                const data = await callAPI(`/api/host/game/${gameID}`);
                if (data && data.status?.game_id) {
                    setGameStatus(data.status);
                }
            }
        } catch (error) {
            console.error('Error setting data:', error);
        }
        finally {
            setLoading(false);
        }
    }


    const sendMessage = useCallback((message) => {
        if (messanger.current) {
            message.game_id = gameID;
            messanger.current(message);
        } else {
            console.error('Messanger is not initialized yet.');
        }
    }, [gameID, messanger]);

    const handleEndGame = async () => {
        sendMessage({
            action: "finish_game",
        });
        setGameState(POSSIBLE_STATES.ENDED);
    }

    const handleSetRoundNames = async () => {
        sendMessage({
            action: "set_round_names",
            round_names: roundNames
        });
        setShowRoundNameEdits(false);
    }

    // call handleCreateGame when startGame is true
    useEffect(() => {
        if (gameState === POSSIBLE_STATES.AUTO_START) {
            setGameState(POSSIBLE_STATES.NOT_EXIST);
            setName("Default Game")
            handleCreateGame();
        }
    }, [gameState, handleCreateGame]);


    const logout = () => {
        // Clear the token and redirect to login page
        sessionStorage.removeItem('authToken');
        window.location.reload();
    }

    return (
        <div>
            <h2>{t("hostInterface")}</h2>
            {false && (
                <div>
                    <button onClick={() => handleLanguageChange("en")}>English</button>
                    <button onClick={() => handleLanguageChange("ru")}>Русский</button>
                </div>
            )}

            {(gameState === POSSIBLE_STATES.NOT_EXIST || gameState === POSSIBLE_STATES.ENDED) && (
                <div>
                    <p>{t("createNewGame")}</p>
                    <input
                        type="text"
                        placeholder={t("numberOfRounds")}
                        value={numRounds}
                        onChange={(e) => setNumRounds(e.target.value)}
                    />
                    <button onClick={handleCreateGame}>{t("createGame")}</button>
                    <br />
                    <p>{t("reconnectGame")}</p>
                    <input
                        type="text"
                        placeholder="Game ID"
                        value={reconnectGameID}
                        onChange={(e) => setReconnectGameID(e.target.value)}
                    />
                    <button onClick={handleReconnectGame}>{t("reconnectGame")}</button>
                    <button onClick={logout}>{t("quitToLogin")}</button>
                </div>
            )}

            {gameState === POSSIBLE_STATES.STARTED && (
                <div>
                    <p>{t("hostToken")}: {sessionStorage.getItem('authToken')}, {t("gameToken")}: {hostData?.token}</p>
                    <h2>{t("round")} {gameStatus?.round_number}: {gameStatus?.round_name} </h2>

                    {gameStatus?.question_state === "running" && (
                        <div>
                            <p>{t("timeRemaining")}: {gameStatus.time_left} {t("seconds")}</p>
                            <button onClick={() => sendMessage({ action: "start_timer" })}>{t("startTimer")}</button>
                        </div>
                    )}

                    {gameStatus?.question_state === "answering" && (
                        <div>
                            {gameStatus.responders?.length && (
                                <div>
                                    <p>{t("answeringFor")}: {gameStatus.nominal}</p>
                                    <p>{t("firstButton")}: {gameStatus.responders[0].name}</p>
                                    <button onClick={() => sendMessage({
                                        action: "host_decision",
                                        host_decision: "accept"
                                    })}>{t("correct")}</button>
                                    <button onClick={() => sendMessage({
                                        action: "host_decision",
                                        host_decision: "decline"
                                    })}>{t("wrong")}</button>
                                    <button onClick={() => sendMessage({
                                        action: "host_decision",
                                        host_decision: "cancel"
                                    })}>{t("cancel")}</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}


            {gameStatus?.current_round_stats &&
                <RoundStatsTable
                    data={gameStatus?.current_round_stats}
                    number_of_question_in_round={gameStatus?.number_of_question_in_round}
                    nominals={gameStatus?.nominals} />}

            {gameState === POSSIBLE_STATES.STARTED && (
                <div>
                    {showRoundNameEdits && (
                        <div>
                            <h3>{t("setTopics")}</h3>
                            <textarea
                                placeholder={t("roundNamesPlaceholder")}
                                value={roundNames}
                                onChange={(e) => setRoundNames(e.target.value)}
                                rows={numRounds || 5}
                                style={{ width: "100%" }}
                            />
                            <button onClick={handleSetRoundNames}>{t("setTopics")}</button>
                        </div>
                    )}
                    {!showRoundNameEdits && (
                        <button onClick={() => setShowRoundNameEdits(true)}>{t("setTopics")}</button>
                    )}
                    <button onClick={handleEndGame}>{t("endGame")}</button>
                </div>
            )}



            {loading && <p>{t("loading")}</p>}


        </div>
    );
}

export default ComponentHost;