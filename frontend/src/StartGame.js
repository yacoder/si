import React, { useState } from "react";
import { handleSubmitHost as handleSubmit } from "./gameFlow";

const App = () => {
    const [screen, setScreen] = useState("start"); // Tracks which screen to show
    const [name, setName] = useState("AAA"); // Name input value (default: AAA)
    const [hostData, setHostData] = useState(null); // Stores host data from the WebSocket
    const [gameStatus, setGameStatus] = useState(null); // Stores game status updates from the WebSocket

    return (
        <div style={{ padding: "20px" }}>
            {screen === "start" && (
                <div>
                    <h1>Start Game</h1>
                    <form
                        onSubmit={(event) =>
                            handleSubmit(event, name, setHostData, setScreen, setGameStatus, screen)
                        }
                    >
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