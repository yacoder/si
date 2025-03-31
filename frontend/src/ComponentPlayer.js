// src/PrepareDataBasedOnURL.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import callAPI from './callAPI';

import { handlePlayerLoop, generatePlayerSummary } from "./gameFlow";
import RoundStatsTable from "./RoundStatsTable";

const POSSIBLE_STATES = {
    AUTO_JOIN: 'AUTO_JOIN',
    NOT_EXIST: 'NOT_EXIST',
    CREATED: 'CREATED',
    STARTED: 'STARTED',
    ENDED: 'ENDED'

}

function ComponentPlayer({ startGame }) {


    const [gameState, setGameState] = useState(startGame ? POSSIBLE_STATES.AUTO_JOIN : POSSIBLE_STATES.NOT_EXIST);
    const [gameID, setGameID] = useState(null);
    const [savedPlayer, setSavedPlayer] = useState(null);
    const [gameStatus, setGameStatus] = useState(null);

    const [loading, setLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await callAPI(`/api/player/game`);
            if (data && data.status?.game_id) {
                setGameID(data.status.game_id);
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

    }

    const disable = false;

    const handleJoinGame = async (event) => {

        if (!savedPlayer?.player_id || !savedPlayer?.name) {
            console.log("Player ID or name is not available...");
            return;
        }


        messanger.current = handlePlayerLoop(savedPlayer.name, gameID, handleSetGameStatus, savedPlayer.player_id);
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
            {gameState === POSSIBLE_STATES.NOT_EXIST && <button onClick={() => logout()}>Something broke</button>}
            {gameState === POSSIBLE_STATES.CREATED && (
                <div>
                    <button onClick={handleJoinGame}>Reconnect to game...</button>
                    <button onClick={() => logout()}>Quit game</button>
                </div>
            )}

            {gameState === POSSIBLE_STATES.STARTED && (
                <div>
                    <h2>Тема: {gameStatus?.round_number}: {gameStatus?.round_name}</h2>
                    {gameStatus?.question_state === "fake" && (
                        <div>
                            <p>Game Status: {JSON.stringify(gameStatus)}</p>
                        </div>
                    )}

                    {gameStatus?.question_state === "running" && (


                        <div>

                            <RoundStatsTable data={gameStatus.current_round_stats} />

                            <button class="round-button" onClick={() => sendMessage({
                                action: "signal",
                                player_id: savedPlayer.player_id,
                                local_ts: Date.now(),

                            })}> {gameStatus.time_left <5 ? gameStatus.time_left : "Тыц!"}</button>
                        </div>
                    )}

                    {disable &&
                    (
                    <button onClick={() => logout()}>Quit game</button>
                    )
                    }

                </div>)}


            {disable && gameState === POSSIBLE_STATES.ENDED && <button onClick={() => logout()}>Game over</button>}

            {disable && generatePlayerSummary(gameStatus?.players, savedPlayer?.player_id)}




            {loading && <p>Loading...</p>}


        </div>
    );
}

export default ComponentPlayer;