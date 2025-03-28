// src/PrepareDataBasedOnURL.js
import React, { useState, useEffect } from 'react';
import callAPI from './callAPI';

const POSSIBLE_STATES = {

    NOT_EXIST: 'NOT_EXIST',
    CREATED: 'CREATED',
    STARTED: 'STARTED',
    ENDED: 'ENDED'

}

function ComponentPlayer() {


    const [gameState, setGameState] = useState(POSSIBLE_STATES.NOT_EXIST);
    const [players, setPlayers] = useState([]);
    const [tournamentName, setTournamentName] = useState(null);

    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await callAPI(`/api/player/game`);
            if (data) {
                setGameState(data.tournament?.status); // TODO: This should actually be game status
                setTournamentName(data.tournament?.name);
                if (data.players) {
                    const player_token = sessionStorage.getItem('authToken');
                    const player = data.players.find(player => player.player_token === player_token);
                    if (player) {
                        player.isCurrentPlayer = true;
                    }
                    setPlayers(data.players);
                }
            } else {
                setGameState(POSSIBLE_STATES.NOT_EXIST);

            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        const fetchInitialData = async () => loadData();
        fetchInitialData();
    }, []);




    const handleLoadGames = async () => {
        await loadData();
    }


    const logout = () => {
        // Clear the token and redirect to login page
        sessionStorage.removeItem('authToken');
        window.location.reload();
    }




    return (
        <div>
            <h2>Player Interface</h2>


            {gameState === POSSIBLE_STATES.NOT_EXIST && <button onClick={() => logout()}>You have not been invited to any games</button>}
            {gameState === POSSIBLE_STATES.CREATED && (
                <div>
                    <h3>Tournament:{tournamentName}</h3>
                    <h3>Game Created, waiting for it to start</h3>


                    <button onClick={() => handleLoadGames()}>Load Game State (TODO: add socket to do it)</button>
                </div>
            )}
            {gameState === POSSIBLE_STATES.STARTED && (
                <div>
                    <h3>Tournament:{tournamentName}</h3>
                    <h3>Game In Progress</h3>

                    <button onClick={() => handleLoadGames()}>Load Game State (TODO: add socket to do it)</button>
                </div>
            )}

            {players.map((player, index) => (
                <div key={index}>

                    <p>{player.isCurrentPlayer ? "*" : ""}{player.name} : {player.score}</p>
                </div>
            ))}
            {gameState === POSSIBLE_STATES.ENDED && <button onClick={() => logout()}>Game over</button>}




            {loading && <p>Loading...</p>}


        </div>
    );
}

export default ComponentPlayer;