// src/PrepareDataBasedOnURL.js
import React, { useState, useEffect, useCallback } from 'react';
import callAPI from './callAPI';

const POSSIBLE_STATES = {
    NOT_EXIST: 'NOT_EXIST',
    CREATED: 'CREATED',
    STARTED: 'STARTED',
    ENDED: 'ENDED'
}

function ComponentHost() {


    const [gameState, setGameState] = useState(POSSIBLE_STATES.NOT_EXIST);
    const [currentTournamentID, setCurrentTournamentID] = useState(null);
    const [gameInviteCode, setGameInviteCode] = useState(null);
    const [tournamentName, setTournamentName] = useState(null);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(false);

    const refreshCurrentTournament = useCallback(async (tournamentID) => {
        tournamentID = tournamentID || currentTournamentID;

        const tournamentDetails = await callAPI(`/api/tournament/${tournamentID}`, 'GET');
        console.log('tournamentDetails', tournamentDetails);

        setGameState(tournamentDetails?.tournament?.status);
        setTournamentName(tournamentDetails?.tournament?.name);

        if (tournamentDetails?.games?.length) {
            const game = tournamentDetails.games[0];
            setGameInviteCode(game?.token);
        }


        setPlayers(tournamentDetails?.players);


    }, [currentTournamentID]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await callAPI(`/api/tournaments`, 'GET');
            console.log('response', data);

            if (data?.length) {
                const lastTournament = data[data.length - 1];
                if (lastTournament?.status !== POSSIBLE_STATES.ENDED) {
                    setCurrentTournamentID(lastTournament.id);
                    await refreshCurrentTournament(lastTournament.id);

                } else {
                    setGameState(POSSIBLE_STATES.ENDED);
                }

            } else {
                setGameState(POSSIBLE_STATES.NOT_EXIST);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [refreshCurrentTournament]);



    useEffect(() => {
        const fetchInitialData = async () => loadData();
        fetchInitialData();
    }, [loadData]);

    const handleCreateGame = async () => {
        try {
            await callAPI(`/api/tournament/create`, 'POST', {
                tournament_data: {
                    "name": tournamentName || "Tournament",
                    "num_parts": 1,
                    "num_rounds": 3,
                    "type": "si",
                    "status": POSSIBLE_STATES.CREATED,
                }

            });
            await loadData();
        } catch (error) {
            console.error('Error setting data:', error);
        }
    }

    const handleStartGame = async () => {
        try {
            await callAPI(`/api/tournament/${currentTournamentID}/update`, 'POST',
                { tournament_data: { status: POSSIBLE_STATES.STARTED } });
            await refreshCurrentTournament();
        } catch (error) {
            console.error('Error setting data:', error);
        }
    }

    const handleLoadPlayers = async () => {
        await refreshCurrentTournament();
    }

    const handleEndGame = async () => {
        try {
            await callAPI(`/api/tournament/${currentTournamentID}/update`, 'POST',
                { tournament_data: { status: POSSIBLE_STATES.ENDED } });
            await loadData();
        } catch (error) {
            console.error('Error setting data:', error);
        }
    }

    return (
        <div>
            <h2>Host Interface</h2>

            {(gameState === POSSIBLE_STATES.NOT_EXIST || gameState === POSSIBLE_STATES.ENDED) && (
                <div>
                    <h3>No Tournament Started</h3>
                    <p>Click the button below to create a new tournament.</p>
                    <input
                        type="text"
                        placeholder="Tournament Name"
                        value={tournamentName}
                        onChange={(e) => setTournamentName(e.target.value)}
                    />

                    <button onClick={handleCreateGame}>Create Tournament/Game</button>
                </div>
            )}
            {gameState === POSSIBLE_STATES.CREATED && (
                <div>
                    <h3>Tournament/Game Created</h3>
                    <p>Tournament Name: {tournamentName}</p>
                    <p>To invite players give them this code: {gameInviteCode}</p>
                    <button onClick={handleLoadPlayers}>Load players (TODO: add socket to do it)</button>
                    <button onClick={handleStartGame}>Start Game</button>
                </div>
            )}
            {gameState === POSSIBLE_STATES.STARTED && (
                <div>
                    <h3>Game In Progress</h3>
                    <button onClick={handleLoadPlayers}>Load players (TODO: add socket to do it)</button>
                    <button onClick={handleEndGame}>End Game</button>
                </div>
            )}

            {players.map((player, index) => (
                <div key={index}>
                    <p>{player.name}</p>
                </div>
            ))}



            {loading && <p>Loading...</p>}


        </div>
    );
}

export default ComponentHost;