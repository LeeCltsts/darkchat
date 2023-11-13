const express = require('express');
const PORT = 7069;
const INDEX = '/';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = require("socket.io")(server,{
  cors: {
    origins: "*:*",
    methods: ["GET", "POST"]
  }
});

const connectedUsers = {};


// Listen for incoming connections on the server
io.on('connection', (socket) => {
    // Log the IP address of the connected user
    const clientIp = socket.handshake.address;

    socket.on('clientID', (userId) => {
        connectedUsers[userId] = {"Searching": false, "Messages": [], "ConnectedClient": ''};
        console.log(`${userId} Connected.`)
    })
  
    // Listen for the 'user searching' event and associate the user ID with the socket ID
    socket.on('userSearching', (userId) => {
        connectedUsers[userId] = {"Searching": true, "Messages": [], "ConnectedClient": ''};
        console.log(`User ${userId} is searching for a user`);
    });

    // Listen for the 'disconnect' event
    socket.on('disconnectFromServer', (userId) => {
        console.log(`Client disconnected with ID: ${userId}`);

        // Remove the user from the database
        if (connectedUsers[userId]) {
            delete connectedUsers[userId];
            console.log(`Removed user with ID: ${userId} from the database`);
        }
    });
  });


// app.get('/get_messages', (req, res) => {
//     const room_id = parseInt(req.query.room_id);
//     const messages = rooms[room_id] || [];
//     res.json({ messages, room_id });
// });

// app.get('/get_stranger_messages', (req, res) => {
//     const user_id = req.query.user_id;
//     const stranger_id = req.query.stranger_id;
//     if (chatSessions[user_id] && chatSessions[user_id]['id'] === stranger_id) {
//         const messages = chatSessions[stranger_id]['messages'];
//         res.json({ messages });
//     } else {
//         res.status(404).json({ error: 'User not found or not in a chat session' });
//     }
// });

// app.get('/fetch_rooms', (req, res) => {
//     res.json({ rooms: Object.keys(rooms) });
// });

// app.post('/create_room', (req, res) => {
//     const room_id = Object.keys(rooms).length + 1;
//     rooms[room_id] = [];
//     res.json({ roomId: room_id });
// });

// app.post('/send_message', (req, res) => {
//     const { message, msg_id, user_id } = req.body;
//     const room_id = parseInt(req.query.room_id);

//     if (rooms[room_id]) {
//         rooms[room_id].push({ message, msg_id, user_id });
//         res.json({ message, msg_id, user_id });
//     } else {
//         res.status(404).json({ error: 'Room not found' });
//     }
// });

// app.post('/send_stranger_message', (req, res) => {
//     const { message, msg_id, user_id, recipient_id } = req.body;

//     if (chatSessions[user_id] && chatSessions[user_id]['id'] === recipient_id) {
//         chatSessions[user_id]['messages'].push({ message, msg_id, user_id });
//         res.json({ message, msg_id, user_id });
//     } else {
//         res.status(404).json({ error: 'User not found or not in a chat session' });
//     }
// });

// app.all('/check_queue', (req, res) => {
//     if (req.method === 'POST') {
//         const data = req.body;

//         if (searchingUsers.length > 0) {
//             const user = {
//                 id: data.user_id,
//                 interests: new Set(data.interests),
//             };

//             const stranger = findStranger(user);

//             if (stranger) {
//                 chatSessions[user.id] = { id: stranger, messages: [] };
//                 getAndPopUserById(searchingUsers, stranger);
//                 res.json({ message: stranger });
//                 return;
//             }
//         }

//         res.json({ message: 'Match not found' });
//     } else {
//         res.json({ message: 'Invalid method' });
//     }
// });

// app.post('/connect', (req, res) => {
//     try {
//         const data = req.body;

//         if (!data.user_id || !data.interests) {
//             res.status(400).json({ error: 'Invalid request data' });
//             return;
//         }

//         const user = {
//             id: data.user_id,
//             interests: new Set(data.interests),
//         };

//         connectedUsers.push(user);
//         searchingUsers.push(user);
//         res.json({ message: 'Connected to server' });
//     } catch (error) {
//         res.status(500).json({ error: error.toString() });
//     }
// });

// app.post('/disconnect', (req, res) => {
//     const user_id = req.body.id;

//     if (user_id in chatSessions) {
//         delete chatSessions[user_id];
//     }

//     const user = getAndPopUserById(connectedUsers, user_id);
//     getAndPopUserById(searchingUsers, user_id);

//     if (user) {
//         res.json({ message: 'Disconnected from server' });
//     } else {
//         res.json({ message: 'Not currently in a chat session or connected to server' });
//     }
// });

// app.get('/check_stranger_disconnect', (req, res) => {
//     const stranger_id = req.query.id;

//     if (!connectedUsers.some((user) => user.id === stranger_id)) {
//         getAndPopUserById(connectedUsers, stranger_id);
//         res.json({ disconnected: true });
//     } else {
//         res.json({ disconnected: false });
//     }
// });

// function findStranger(user) {
//     const matchingUsers = searchingUsers.filter(
//         (u) => u.id !== user.id && [...u.interests].some((interest) => user.interests.has(interest))
//     );

//     if (matchingUsers.length > 0) {
//         const stranger = matchingUsers[Math.floor(Math.random() * matchingUsers.length)];
//         return stranger.id;
//     } else {
//         return null;
//     }
// }

// function getAndPopUserById(userList, userId) {
//     const index = userList.findIndex((user) => user.id === userId);

//     if (index !== -1) {
//         const poppedUser = userList.splice(index, 1)[0];
//         return poppedUser.id;
//     }

//     return null;
// }

// function createId() {
//     const idLength = 26;
//     return uuidv4().replace(/-/g, '').substring(0, idLength);
// }