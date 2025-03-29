import React, { useState, useEffect } from "react";

const App = () => {
    const [screen, setScreen] = useState("start"); // Tracks which screen to show
    const [name, setName] = useState("AAA"); // Name input value (default: AAA)
    const [hostData, setHostData] = useState(null); // Stores host data from the WebSocket
    const [gameStatus, setGameStatus] = useState(null); // Stores game status updates from the WebSocket

    const handleSubmit = (event) => {
        event.preventDefault(); // Prevent default form submission behavior

        // Open a WebSocket connection
        const socket = new WebSocket("ws://127.0.0.1:4000/ws");

        socket.onopen = () => {
            console.log("WebSocket connection opened");

            // Send JSON message with action and host_name
            const message = {
                action: "start_game",
                host_name: name,
            };
            socket.send(JSON.stringify(message));
            console.log("Message sent:", message);
        };

        socket.onmessage = (message) => {
            try {
                console.log("Message received:", message);
                let data = message.data;
                console.log("Data received:", data);
                data = data.replace(/'/g, '"');
                data = JSON.parse(data);

                if (screen === "start") {
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

    };

    return (
        <div style={{ padding: "20px" }}>
            {screen === "start" && (
                <div>
                    <h1>Start Game</h1>
                    <form onSubmit={handleSubmit}>
                        <label>
                            Enter Name:
                            <input
                                type="text"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                required
                            />
                        </label>
                        <button type="submit">Submit</button>
                    </form>
                </div>
            )}

            {screen === "host" && hostData && (
                <div>
                    <h1>Host Screen</h1>
                    <p><strong>Host Name:</strong> {hostData.name}</p>
                    <div style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc" }}>
                        <h3>Game Status:</h3>
                        {gameStatus ? (
                            <pre>{JSON.stringify(gameStatus, null, 4)}</pre>
                        ) : (
                            <p>Waiting for updates...</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
