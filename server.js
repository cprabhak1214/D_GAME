const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Store lobbies in memory (use a database for production)
const lobbies = {};

// Serve static files (frontend)
app.use(express.static('public'));

// API endpoint for creating a lobby
app.post('/create-lobby', (req, res) => {
    const lobbyCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    lobbies[lobbyCode] = { players: [] };
    res.json({ lobbyCode });
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a lobby
    socket.on('joinLobby', ({ lobbyCode, playerName }) => {
        const lobby = lobbies[lobbyCode];
        if (lobby) {
            socket.join(lobbyCode);
            lobby.players.push({ id: socket.id, name: playerName });
            io.to(lobbyCode).emit('playerListUpdate', lobby.players);
            console.log(`${playerName} joined lobby ${lobbyCode}`);
        } else {
            socket.emit('error', 'Lobby not found');
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        for (const [lobbyCode, lobby] of Object.entries(lobbies)) {
            const playerIndex = lobby.players.findIndex((p) => p.id === socket.id);
            if (playerIndex !== -1) {
                const [removedPlayer] = lobby.players.splice(playerIndex, 1);
                io.to(lobbyCode).emit('playerListUpdate', lobby.players);
                console.log(`${removedPlayer.name} disconnected from lobby ${lobbyCode}`);
                break;
            }
        }
    });
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
