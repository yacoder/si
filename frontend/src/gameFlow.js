function calculateSocketFromHost(host) {
    if (host) {
        const hostParts = host.split("/");
        if (hostParts.length >= 3) {
            const hostName = hostParts[2];
            let protocol = "ws:";
            if (hostParts[0] === "https:") {
                protocol = "wss:";
            };
            if (hostName) {
                return `${protocol}//${hostName}/ws`;
            }
        }
    }
    return "ws://127.0.0.1:4000/ws";
}

export const generatePlayerSummary = (players, player_id) => {
    return (
        <div class="player_summary">
            {players?.map((player) => {
                const isCurrentPlayer = player.player_id === player_id;
                return (
                    <div key={player.player_id}>
                        {isCurrentPlayer && (<strong >{player.name}: {player.score}</strong>)}
                        {!isCurrentPlayer && (<p >{player.name}: {player.score}</p>)}
                    </div>
                )

            })}
        </div>
    )
};



export const handleLoop = (name, setHostData, setScreen, setGameStatus, screen,
    host_or_player_id = null, game_id = null, additional_game_params = {}, url = null) => {

    let currentSocket = null; // Declare currentSocket variable
    let numberOfRetries = 1;
    let gameStartedID = null;

    const getCurrentSocket = () => {
        return currentSocket;
    }

    const attemptToReconnect = () => {
        // start timer to reconnect
        setTimeout(() => {
            console.log("Attempting to reconnect...");

            if (numberOfRetries < 100) {
                numberOfRetries++;
                currentSocket = createSocket(); // Create a new socket instance
            } else {
                console.error("Max retries reached. Unable to reconnect.");
                // TODO: add better error reporting
            }
        }, 1000 * (numberOfRetries > 20 ? 20 : numberOfRetries)); // Retry every 1/2/20 seconds then continue at 20 seconds
    }

    const createSocket = () => {
        // Open a WebSocket connection
        const socket = new WebSocket(calculateSocketFromHost(url));

        socket.onopen = () => {
            console.log("WebSocket connection opened");
            numberOfRetries = 1;

            // Send JSON message with action and host_name
            if (screen === "start") {
                const message = gameStartedID ? {
                    action: "host_reconnect",
                    game_id: gameStartedID,
                } : {
                    action: "start_game",
                    host_name: name,
                    host_id: host_or_player_id,
                    ...additional_game_params,
                };
                socket.send(JSON.stringify(message));
                console.log("Message sent:", message);
            } else if (screen === "reconnect") {
                const message = {
                    action: "host_reconnect",
                    game_id: game_id,
                };
                socket.send(JSON.stringify(message));
                console.log("Message sent:", message);
            } else if (screen === "player_start") {
                const message = {
                    "action": "register",
                    "name": name,
                    "game_id": game_id,
                    "player_id": host_or_player_id,
                };
                socket.send(JSON.stringify(message));
                console.log("Message sent:", message);

            }

        };

        socket.onmessage = (message) => {
            try {
                console.log("Message received:", message);
                let data = message.data;
                console.log("Data received:", data);
                data = data.replace(/'/g, '"');
                data = JSON.parse(data);

                if (screen === "start" || screen === "reconnect") {
                    // Save host data and navigate to Host Screen
                    if (data.host) {
                        gameStartedID = data.id;
                        console.log("Host:", data['host'], "starting game:", gameStartedID);
                        setHostData(data.host); // Save host details
                        setScreen("host"); // Switch to Host Screen

                    }
                    console.log("Message received:", data);
                }
                try {
                    if (data.status) {
                        console.log("setting status", data.status);
                        setGameStatus(data.status); // Update game status
                    }
                    if (data.action) {

                        if(data.action === "offset_check") {
                            console.log("checking offset for host", data.offset_check);
                            data['client_ts'] = Date.now();
                            socket.send(JSON.stringify(data));
                        }
                        else if (data.action === 'offset_check_result') {
//                            setClientSeverLag(data['client_server_lag']);
//                            setSeveClientrLag(data['server_client_lag']);
                        }

                        }
                } catch (error) {
                    console.error("Error processing incoming status update:", error);
                }
            } catch (error) {
                console.error("Error processing incoming message:", error);
            }
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
            // attemptToReconnect(); // Attempt to reconnect on error
        };

        socket.onclose = () => {
            console.log("WebSocket connection closed");
            attemptToReconnect(); // Attempt to reconnect on close
        };

        return socket; // Return the socket instance
    }

    currentSocket = createSocket(); // Call the function to create the socket




    return function (message) {
        const socket = getCurrentSocket();
        if (!socket) {
            console.error("WebSocket is not initialized.");
            return;
        }
        socket.send(JSON.stringify(message));
        console.log("Message sent:", message);
    }

};

export const handleSubmitHost = (event, name, setHostData, setScreen, setGameStatus, screen, host_id = null, additional_game_params = {}, url = null) => {
    event.preventDefault(); // Prevent default form submission behavior
    handleLoop(name, setHostData, setScreen, setGameStatus, screen, host_id, null, additional_game_params, url);
    return;
}


export const handlePlayerLoop = (name, game_id, setGameStatus, player_id = null, url = null) => {
    return handleLoop(name, () => { }, () => { }, setGameStatus, "player_start", player_id, game_id, {}, url);
};

