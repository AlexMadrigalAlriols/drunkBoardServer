const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const bodyParser = require("body-parser");
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, { cors: true, origins: ["*"] });
const sequelize = require("./db");
const routes = require("./src/routes");
const { User, Board, Cell } = require("./src/models"); // Asegúrate de que la ruta es correcta
const path = require('path');

app.use(cors({
  origin: '*', // Permite todas las peticiones desde cualquier origen
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Cabeceras permitidas
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api", routes);
app.use('/public', express.static(path.join(__dirname, 'public')));

// Estructura para almacenar lobbies
let lobbies = {};

// Configuración de Socket.io
io.on("connection", (socket) => {
  let userId = null;
  let currentLobby = null;

  socket.on("joinLobby", async (lobbyId, userId, callback) => {
    if (lobbies[lobbyId]) {
      currentLobby = lobbyId;
      socket.join(lobbyId);
      if (!lobbies[lobbyId].users.includes(userId)) {
        lobbies[lobbyId].users.push(userId);
      }

      try {
        const user = await User.findByPk(userId);
        const userList = await getUserList(lobbyId);
        io.to(lobbyId).emit("userJoined", { userId, user });
        io.to(lobbyId).emit("userListUpdate", userList);
        callback({ users: userList, owner: lobbies[lobbyId].owner, started: lobbies[lobbyId].started });
      } catch (error) {
        console.log(error);
        callback(false);
      }
    } else {
      callback(false);
    }
  });

  socket.on("createLobby", async (userId, callback) => {
    const user = await User.findByPk(userId);

    const lobbyId = Math.random().toString(36).substring(7).toUpperCase();
    lobbies[lobbyId] = { owner: user, users: [], started: false };
    currentLobby = lobbyId;
    socket.join(lobbyId);

    callback(lobbyId);
  });

  socket.on("leaveLobby", async (lobbyId, userId, callback) => {
    if (lobbies[lobbyId]) {
      const index = lobbies[lobbyId]?.users.indexOf(userId);
      
      if (index > -1) {
        changeTurn(lobbyId, userId);
        lobbies[lobbyId].users.splice(index, 1);
        try {
          const userList = await getUserList(lobbyId);
          io.to(lobbyId).emit("userListUpdate", userList);
          io.to(lobbyId).emit("userLeft", { userId });
        } catch (error) {
          console.error("Error al obtener la lista de usuarios:", error);
        }
      }

      if((lobbies[lobbyId]?.owner ?? null) !== null && lobbies[lobbyId]?.owner.id === userId) {
        const newOwner = await User.findByPk(lobbies[lobbyId].users[0]);
        lobbies[lobbyId].owner = newOwner;
        io.to(lobbyId).emit("giveOwner", { user: newOwner });
      }

      if (lobbies[lobbyId]?.users && lobbies[lobbyId].users.length === 0) {
        delete lobbies[lobbyId];
        socket.leave(lobbyId);
    }

      callback(true);
    }
  });

  socket.on("kickPlayer", async (lobbyId, userId, callback) => {
    if (lobbies[lobbyId]) {
      const index = lobbies[lobbyId]?.users.indexOf(userId);
      if (index > -1) {
        lobbies[lobbyId].users.splice(index, 1);
        try {
          const userList = await getUserList(lobbyId);
          io.to(lobbyId).emit("userListUpdate", userList);
          io.to(lobbyId).emit("kickPlayer", { userId });
        } catch (error) {
          console.error("Error al obtener la lista de usuarios:", error);
        }
      }

      if(!lobbies[lobbyId].users || lobbies[lobbyId].users.length === 0) {
        delete lobbies[lobbyId];
        socket.leave(lobbyId);
      }

      callback(true);
    }
  });

  socket.on("giveOwner", async (lobbyId, userId, callback) => {
    if (lobbies[lobbyId]) {
        const user = await User.findByPk(userId);
      io.to(lobbyId).emit("giveOwner", { user });
      lobbies[lobbyId].owner = user;

      callback(user);
    }
  });

  socket.on("startGame", async (lobbyId, callback) => {
    if(lobbies[lobbyId]) {
      // get random user to start
      const userId = lobbies[lobbyId].users[Math.floor(Math.random() * lobbies[lobbyId].users.length)];
      const startUser = await User.findByPk(userId);
      const boardActual = await Board.findByPk(1, {
        include: [{
          model: Cell,
          as: 'cells'
        }]
      });

      io.to(lobbyId).emit("gameStarted", { startUser, board: boardActual });
      lobbies[lobbyId].started = true;
      callback(true);
    }
  });

  socket.on("changeGameTurn", async (lobbyId, userId, callback) => {
    if(lobbies[lobbyId]) {
      changeTurn(lobbyId, userId);
      callback(true);
    }

    callback(false);
  });

  socket.on("updatePlayerPosition", async (lobbyId, userId, position, callback) => {
    if(lobbies[lobbyId]) {
      io.to(lobbyId).emit("playerPositionUpdated", { userId, position });
      callback(true);
    }

    callback(false);
  });

  socket.on("playerLandOnCell", async (lobbyId, userId, cellId, callback) => {
    if(lobbies[lobbyId]) {
      io.to(lobbyId).emit("playerLandedOnCell", { userId, cellId });
      callback(true);
    }

    callback(false);
  });

  socket.on("jailPlayer", async (lobbyId, userId, callback) => {
    if(lobbies[lobbyId]) {
      console.log(lobbies[lobbyId].users);
      lobbies[lobbyId].users = lobbies[lobbyId].users.map(player => { 
        if (player.id === userId) {
          if(player.jailed) {
            return { ...player, jailed: false };
          } else {
            return { ...player, jailed: true };
          }
        }
        return player;
      });

      io.to(lobbyId).emit("playerJailed", { userId });
      callback(true);
    }

    callback(false);
  });

  socket.on("disconnect", async () => {
    if (currentLobby && userId) {
      const index = lobbies[currentLobby]?.users.indexOf(userId);
      if (index > -1) {
        lobbies[currentLobby].users.splice(index, 1);
        try {
          const userList = await getUserList(currentLobby);
          io.to(currentLobby).emit("userListUpdate", userList);
          io.to(currentLobby).emit("userLeft", { userId });
        } catch (error) {
          console.error("Error al obtener la lista de usuarios:", error);
        }
      }
    }
  });

  async function getUserList(lobbyId) {
    const userIds = lobbies[lobbyId]?.users || [];
    try {
      const users = await User.findAll({ where: { id: userIds } });
      return users;
    } catch (error) {
      console.error("Error al obtener la lista de usuarios:", error);
      return [];
    }
  }

  async function changeTurn(lobbyId, userId) {
    const index = lobbies[lobbyId].users.indexOf(userId);
    let nextIndex = index + 1;
    if(nextIndex >= lobbies[lobbyId].users.length) {
      nextIndex = 0;
    }
    const nextUserId = lobbies[lobbyId].users[nextIndex];
    const nextUser = await User.findByPk(nextUserId);

    io.to(lobbyId).emit("gameTurnChanged", { nextUser });
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
