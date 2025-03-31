// src/PrepareDataBasedOnURL.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Cookies from 'js-cookie';
import callAPI from './callAPI';
import { handleLoop as handleHostLoop, generatePlayerSummary } from "./gameFlow";

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
            const messanger_handler = handleHostLoop(name, setHostData, switchStatus, switchGameStatus, 'start', null, null,
                { number_of_rounds: numRounds },
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
        try {
            const data = await callAPI(`/api/host/game/${gameID}`);
            if (data && data.status?.game_id) {
                setGameStatus(data.status);
            }
        } catch (error) {
            console.error('Error setting data:', error);
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
            action: "finalize",
        });
        setGameState(POSSIBLE_STATES.ENDED);
    }

    // call handleCreateGame when startGame is true
    useEffect(() => {
        if (gameState === POSSIBLE_STATES.AUTO_START) {
            setGameState(POSSIBLE_STATES.NOT_EXIST);
            setName("Default Game")
            handleCreateGame();
        }
    }, [gameState, handleCreateGame]);

    return (
        <div class="container">
            <h2>Host Interface</h2>
            {(gameState === POSSIBLE_STATES.NOT_EXIST || gameState === POSSIBLE_STATES.ENDED) && (
                <div class="container">
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
                </div>
            )}

            {gameState === POSSIBLE_STATES.STARTED && (
                <div class="container">
                    <h3>Game In Progress</h3>

                    <p>Game ID:{gameID}, Token: {hostData.token}</p>

                    {gameStatus?.question_state === "running" && (
                        <div class="container">
                            <p>Playing for: {gameStatus.nominal}</p>
                            <p>Time Remaining: {gameStatus.time_left} seconds</p>
                            <button onClick={() => sendMessage({ action: "start_timer" })}>Start Timer</button>
                        </div>
                    )}

                    {gameStatus?.question_state === "answering" && (
                        <div class="container">
                            {gameStatus.responders?.length && (
                                <div class="container">
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



                    <button onClick={handleEndGame}>End Game</button>
                </div>
            )}

            {generatePlayerSummary(gameStatus?.players, null)}



            {loading && <p>Loading...</p>}


        </div>
    );
}

export default ComponentHost;