// src/PrepareDataBasedOnURL.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import callAPI from './callAPI';
import { handleLoop as handleHostLoop, generatePlayerSummary } from "./gameFlow";
import RoundStatsTable from "./RoundStatsTable";

const POSSIBLE_STATES = {
    AUTO_START: 'AUTO_START',
    NOT_EXIST: 'NOT_EXIST',
    STARTED: 'STARTED',
    ENDED: 'ENDED'

}



function ComponentHost({ startGame, autostartNumRounds }) {

    const [gameState, setGameState] = useState(startGame ? POSSIBLE_STATES.AUTO_START : POSSIBLE_STATES.NOT_EXIST);
    const [loading, setLoading] = useState(false);


    const [name, setName] = useState("Test Game"); // Name input value (default: AAA)
    const [hostData, setHostData] = useState(null); // Stores host data from the WebSocket
    const [gameStatus, setGameStatus] = useState(null); // Stores game status updates from the WebSocket
    const [reconnectGameID, setReconnectGameID] = useState(null); // Stores game ID for reconnection
    const [gameID, setGameID] = useState(null); // Stores game ID for reconnection
    const [numRounds, setNumRounds] = useState(autostartNumRounds); // Number of rounds for the game
    const [roundNames, setRoundNames] = useState(""); // Stores topics for the game
    const [showRoundNameEdits, setShowRoundNameEdits] = useState(false); // Flag to show/hide round name edits




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
            <h2>Host Interface</h2>
            {(gameState === POSSIBLE_STATES.NOT_EXIST || gameState === POSSIBLE_STATES.ENDED) && (
                <div>
                    <h3>No Games Started</h3>
                    <p>Click the button below to create a new game.</p>
                    <input
                        type="text"
                        placeholder="Number of rounds"
                        value={numRounds}
                        onChange={(e) => setNumRounds(e.target.value)}
                    />
                    <button onClick={handleCreateGame}>Create Game</button>
                    <br />
                    <p>Or reconnect to an existing game.</p>
                    <input
                        type="text"
                        placeholder="Game ID"
                        value={reconnectGameID}
                        onChange={(e) => setReconnectGameID(e.target.value)}
                    />
                    <button onClick={handleReconnectGame}>Reconnect to existing game</button>
                    <button onClick={() => logout()}>Quit to login</button>
                </div>
            )}

            {gameState === POSSIBLE_STATES.STARTED && (
                <div>
                    <h3>Game In Progress</h3>

                    <p>Game ID:{gameID}, Token: {hostData.token}</p>

                    {gameStatus?.question_state === "running" && (
                        <div>
                            <p>Playing for: {gameStatus.nominal}</p>
                            <p>Time Remaining: {gameStatus.time_left} seconds</p>
                            <button onClick={() => sendMessage({ action: "start_timer" })}>Start Timer</button>
                        </div>
                    )}

                    {gameStatus?.question_state === "answering" && (
                        <div>
                            {gameStatus.responders?.length && (
                                <div>
                                    <p>Answering for: {gameStatus.nominal}</p>
                                    <p>First button: {gameStatus.responders[0].name}</p>
                                    <button onClick={() => sendMessage({
                                        "action": "host_decision",
                                        "host_decision": "accept"
                                    })}>Correct</button>
                                    <button onClick={() => sendMessage({
                                        "action": "host_decision",
                                        "host_decision": "decline"
                                    })}>Wrong</button>
                                    <button onClick={() => sendMessage({
                                        "action": "host_decision",
                                        "host_decision": "cancel"
                                    })}>Cancel</button>
                                </div>
                            )}


                        </div>
                    )}



                </div>
            )}

            {false && generatePlayerSummary(gameStatus?.players, null)}
            {gameStatus?.current_round_stats && <RoundStatsTable data={gameStatus?.current_round_stats} />}

            {gameState === POSSIBLE_STATES.STARTED && (
                <div>
                    {showRoundNameEdits && (
                        <div>
                            <h3>Темы</h3>
                            <textarea
                                placeholder="Round Names (one per line)"
                                value={roundNames}
                                onChange={(e) => setRoundNames(e.target.value)}
                                rows={numRounds || 5}
                                style={{ width: "100%" }} // Optional: Make it full width
                            />
                            <button onClick={handleSetRoundNames}>Задать темы</button>
                        </div>
                    )}
                    {!showRoundNameEdits && (
                        <button onClick={() => setShowRoundNameEdits(true)}>Задать темы</button>
                    )}
                    <button onClick={handleEndGame}>End Game</button>
                </div>
            )}



            {loading && <p>Loading...</p>}


        </div>
    );
}

export default ComponentHost;