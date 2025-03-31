function calculateSocketFromHost(host) {
    if (host) {
        const hostParts = host.split("/");
        if (hostParts.length >= 3) {
            const hostName = hostParts[2];
            if (hostName) {
                return `ws://${hostName}/ws`;
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


    // Open a WebSocket connection
    const socket = new WebSocket(calculateSocketFromHost(url));

    socket.onopen = () => {
        console.log("WebSocket connection opened");



        // Send JSON message with action and host_name
        if (screen === "start") {
            const message = {
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
                    console.log("Host:", data['host']);
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

                if (data.action && data.action == "offset_check") {
                    console.log("checking offset for host", data.offset_check);
                    data['client_ts'] = Date.now();
                    socket.send(JSON.stringify(data));
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
    };

    socket.onclose = () => {
        console.log("WebSocket connection closed");
    };

    return function (message) {
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

