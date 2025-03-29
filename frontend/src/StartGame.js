import React, { useState, useEffect } from "react";

const App = () => {
    const [name, setName] = useState(""); // State to store the entered name
    const [latestEvent, setLatestEvent] = useState(""); // State to store the latest incoming event
    const [socket, setSocket] = useState(null); // State to store the WebSocket connection

    const handleSubmit = (event) => {
        event.preventDefault(); // Prevent form submission from refreshing the page

        // Open a WebSocket connection
        const newSocket = new WebSocket("ws://127.0.0.1:4000/ws");

        newSocket.onopen = () => {
            console.log("WebSocket connection opened");

            // Send JSON data over the WebSocket
            const message = {
                action: "start_game",
                host_name: name
            };
            newSocket.send(JSON.stringify(message)); // Convert the message to JSON format
            console.log("Message sent:", message);
        };

        newSocket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        newSocket.onclose = () => {
            console.log("WebSocket connection closed");
        };

        newSocket.onmessage = (message) => {
            try {
                console.log("Message received:", message);
//                const data = JSON.parse(message.data); // Parse incoming message
                const data = message.data; // Parse incoming message

                setLatestEvent(data); // Update latest event on the screen

                console.log("Message received:", data);
            } catch (error) {
                console.error("Error processing incoming message:", error);
            }
        };

        setSocket(newSocket); // Save the WebSocket connection in state
    };

    // Clean up WebSocket connection on component unmount
    useEffect(() => {
        return () => {
            if (socket) {
                socket.close();
                console.log("WebSocket connection cleaned up");
            }
        };
    }, [socket]);

    return (
        <div style={{ padding: "20px" }}>
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

            {latestEvent && (
                <div style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc" }}>
                    <h3>Latest Event:</h3>
                    <p>{latestEvent}</p>
                </div>
            )}
        </div>
    );
};

export default App;
