// src/PrepareDataBasedOnURL.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import callAPI from './callAPI';

import { handlePlayerLoop, generatePlayerSummary } from "./gameFlow";

const POSSIBLE_STATES = {

    NOT_EXIST: 'NOT_EXIST',
    CREATED: 'CREATED',
    STARTED: 'STARTED',
    ENDED: 'ENDED'

}

function ComponentPlayer() {


    const [gameState, setGameState] = useState(POSSIBLE_STATES.NOT_EXIST);
    const [gameID, setGameID] = useState(null);
    const [savedPlayer, setSavedPlayer] = useState(null);
    const [gameStatus, setGameStatus] = useState(null);



    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await callAPI(`/api/player/game`);
            if (data && data.status?.game_id) {
                setGameID(data.status.game_id);
                setSavedPlayer(data.player);
                setGameState(POSSIBLE_STATES.CREATED);
            } else {
                setGameState(POSSIBLE_STATES.NOT_EXIST);

            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const messanger = useRef(null);



    useEffect(() => {
        const fetchInitialData = async () => loadData();
        fetchInitialData();
    }, []);

    const handleSetGameStatus = (status) => {
        setGameState(POSSIBLE_STATES.STARTED)
        setGameStatus(status);

    }

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
            <h2>Player Interface</h2>


            {gameState === POSSIBLE_STATES.NOT_EXIST && <button onClick={() => logout()}>Something broke</button>}
            {gameState === POSSIBLE_STATES.CREATED && (
                <div>
                    <button onClick={handleJoinGame}>Game created, click to join...</button>
                </div>
            )}

            {gameState === POSSIBLE_STATES.STARTED && (
                <div>
                    <h3>Game ID: {gameID}</h3>
                    {gameStatus?.question_state === "fake" && (
                        <div>
                        <p>Game Status: {JSON.stringify(gameStatus)}</p>
                        </div>
                    )}

                    {gameStatus?.question_state === "running" && (
                        <div>
                            <p>Playing for: {gameStatus.nominal}</p>
                            <p>Time Remaining: {gameStatus.time_left} seconds</p>
                            <button onClick={() => sendMessage({
                                action: "signal",
                                player_id: savedPlayer.player_id,
                                local_ts: Date.now(),

                            })}>ANSWER!!</button>
                        </div>
                    )}

                    <button onClick={() => logout()}>Quit game</button>
                </div>)}

            {gameState === POSSIBLE_STATES.ENDED && <button onClick={() => logout()}>Game over</button>}

            {generatePlayerSummary(gameStatus?.players, savedPlayer?.player_id)}




            {loading && <p>Loading...</p>}


        </div>
    );
}

export default ComponentPlayer;