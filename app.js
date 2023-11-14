/*
    The backend for darkerchat.com

    The functionality is as follows:
        CONNECTIONS AND SEARCHING
        1. When a user opens the website, they emit a connection signal to the backend.
        2. When a user connects, they are put into a dictionary of connected users.
            2a. Currently, we do not have a DB to store current users,
                so if the server were to go down, all connected clients would be removed from the 
                dictionary (as the backend has been restarted). We will have to include error
                handling for situations like this.
        3. A user will be able to input interests and search for a stranger on the front end.
        4. When a user inputs their interest(s) (if they have any), they will emit a
            "userSearching" signal to the backend.
            4a. The searching logic is as follows: 
                4a1. When a user begins searching for a stranger, the backend
                        checks for a stranger in the connectedUsers dictionary who is also
                        searching for a stranger.
                4a2. If a stranger with similar interests is found, the backend emits a
                        "foundStranger" signal to both users
                4a3. The server will check for a stranger for timeout of 30 seconds,
                        if no stranger is found then the backend will emit a "strangerNotFound"
                        signal to the user searching.

        5. If two strangers are connected, they will be able to send messages to each other
            on the front end. 

        SENDING MESSAGES
        6. This is where encryption occurs. When two strangers connect to each other, they
            will both generate a set of keys.
            User A will generate a public key and send it to User B.
            User A will generate a private key and keep it private.

            User B will generate a public key and send it to User A.
            User A will generate a private key and keep it private.

            If User A wants to send a messsage to User B,
            User A encrypts the message using User B's public key
            User A sends the encrypted message to the backend.
            The backend sends the encrypted message to User B
            User B decrypts the message using their private key. 
*/

const express = require('express');
const PORT = 7069;
const INDEX = '/';

const server = express()
  .use((req, res) =>
    res.sendFile(INDEX, {
      root: __dirname,
    })
  )
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = require('socket.io')(server, {
  cors: {
    origins: '*:*',
    methods: ['GET', 'POST'],
  },
});

const connectedUsers = {};

//#region Main

// Listen for connections
io.on('connection', socket => {
  let connectedUserId = socket.id;

  socket.on('ClientID', userId => {
    // Add the connected user to the dictionary
    connectedUsers[userId] = {
      Searching: false,
      Messages: [],
      ConnectedClientID: connectedUserId,
      UserID: userId,
      StrangerID: null,
    };
    console.log(`${userId} Connected.`);
  });

  socket.on('UserSearching', (userId, interests = []) => {
    // If we are searching, set the user that sent the searching signal to true
    connectedUsers[userId] = {
      Searching: true,
      Messages: [],
      ConnectedClientID: connectedUserId,
      UserID: userId,
      StrangerID: null,
      Interests: interests,
    };
    // Search for a stranger using similar interests
    searchForStranger(connectedUsers[userId]);
    
    console.log(
      `User ${userId} is searching for a user with the interests ${connectedUsers[userId]['Interests']}`
    );
  });

  socket.on('UserMessage', (userId, message) => {
    const ourUser = connectedUsers[userId];
    const stranger = connectedUsers[ourUser['StrangerID']];
    ourUser['Messages'].push(message);
    const strangerSocket = io.sockets.sockets.get(
      stranger['ConnectedClientID']
    );
    strangerSocket.emit('GetMessage', message);
  });

  socket.on('disconnect', () => {
    const disconnectedUserId = getUserBySocket(socket.id);
    const disconnectedUser = connectedUsers[disconnectedUserId];
    if (disconnectedUser) {
      handleDisconnect(disconnectedUser);
      console.log(
        `User ${disconnectedUserId} has been removed from connected users.`
      );
    }
  });
});

//#endregion

async function handleDisconnect(disconnectedUser) {
  if (disconnectedUser['StrangerID']) {
    let stranger = connectedUsers[disconnectedUser['StrangerID']];
    stranger['StrangerID'] = null;
    const strangerSocket = io.sockets.sockets.get(
      stranger['ConnectedClientID']
    );
    strangerSocket.emit('DisconnectFromStranger');
  }
  delete connectedUsers[disconnectedUser['UserID']];
}

async function searchForStranger(ourUser) {
  let usersArray = Object.values(connectedUsers).filter(
    user => user.Searching && user.UserID !== ourUser.UserID
  ); // Filter only searching users

  const ourUserSocket = io.sockets.sockets.get(
        ourUser['ConnectedClientID']
      );

  let commonInterests = []
  for (let user of usersArray) {
    // If we found a stranger with similar interests
    commonInterests = arraysEqual(user.Interests, ourUser.Interests);
    if (commonInterests.length > 0) {
      // Set both the users searching flag to false, and set the stranger id
      connectedUsers[ourUser.UserID]['Searching'] = false;
      connectedUsers[ourUser.UserID]['StrangerID'] = user.UserID;
      user['Searching'] = false;
      user['StrangerID'] = ourUser.UserID;

      // Emit to the users that they have found a stranger, include the interests arrays
      const strangerSocket = io.sockets.sockets.get(user['ConnectedClientID']);

      ourUserSocket.emit('foundStranger', commonInterests);
      strangerSocket.emit('foundStranger', commonInterests);

      console.log('Two users found each other with the interests:', commonInterests)
      return;
    }
  }

  if (commonInterests.length === 0){
    ourUserSocket.emit('StrangerNotFound')
    return
  }
}

// Function to compare arrays for equality
async function arraysEqual(arr1, arr2) {
  let result = [];
  for (let i = 0; i < arr1.length; i++) {
    if (arr2.includes(arr1[i])) {
      result.push(arr1[i]);
    }
  }
  return result;
}

async function binarySearch(arr, target) {
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    let mid = Math.floor((low + high) / 2);
    if (arr[mid].Searching === target) {
      return arr[mid];
    } else if (arr[mid].ConnectedClientID.localeCompare(target) < 0) {
      // Use localeCompare for string comparison
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return null;
}

async function getUserBySocket(socketId) {
  const userId = Object.keys(connectedUsers).find(
    userId => connectedUsers[userId].ConnectedClientID === socketId
  );
  return userId;
}
