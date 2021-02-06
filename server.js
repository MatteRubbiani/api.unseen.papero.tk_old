const io = require('socket.io')(3000)
const ActiveUsersManager = require("./managers/activeUsers")
const PathsManager = require("./staticGameConfiguration/paths")
const ActiveGamesManager = require("./managers/activeGames")
const Endpoints = require("./staticGameConfiguration/endpoints")
const app = require('express')();
const http = require('http').Server(app);

io.on('connection', socket => {
  socket.on(Endpoints.CONNECT_TO_GAME, data => {
    let user_id = data["user_id"]
    let game_id = data["game_id"]
    let username = data["username"]
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    if (user){
      let s = io.sockets.connected[user.session_id]
      if (s){
        io.sockets.connected[user.session_id].emit(Endpoints.SESSION_PAUSED, "");
      }
    }
    ActiveUsersManager.addActiveUser(game_id, user_id, socket.id, username)
    let game = ActiveGamesManager.getActiveGameById(game_id)
    if (!game){
      game = ActiveGamesManager.createActiveGame(user_id, game_id)
      game.saveToFile()
    }
    socket.emit(Endpoints.CONNECT_TO_GAME, game.getGame(user_id))
    sendLobbyChangedToPlayers(game)
  })

  socket.on(Endpoints.JOIN_GAME, ()=> {
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    if (!user) return null
    let game = ActiveGamesManager.getActiveGameById(user.game_id)
    if (!game || game.status !== 0) return null
    let success = game.addPlayer(user.user_id)
    game.saveToFile()
    if (!success) return null
    sendLobbyChangedToPlayers(game)
  })

  socket.on(Endpoints.QUIT_GAME, ()=>{
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    if (!user) return null
    let game = ActiveGamesManager.getActiveGameById(user.game_id)
    if (game) {
      if (game.status === 0) {
        let success = game.removePlayer(user.user_id)
        game.saveToFile()
        if (success) sendLobbyChangedToPlayers(game)
      }
    }
  })

  socket.on(Endpoints.KICK_FROM_GAME, (localId)=>{
    console.log(localId)
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    if (!user) return null
    let game = ActiveGamesManager.getActiveGameById(user.game_id)
    if (game) {
      let player = game.getPlayerById(user.user_id)
      if (game.admin_user_id === player.local_id){
        if (game.status === 0) {
          let user_t_r = game.getPlayerByLocalId(localId)
          let success = game.removePlayer(user_t_r.user_id)
          game.saveToFile()
          if (success) sendLobbyChangedToPlayers(game)
        }
      }
    }
  })

  socket.on(Endpoints.CHANGE_COLOR, color => {
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    if (!user) return null
    let game = ActiveGamesManager.getActiveGameById(user.game_id)
    if (!game || game.status !== 0) return null
    let success = game.setColor(user.user_id, parseInt(color))
    if (!success) return null
    game.saveToFile()
    sendLobbyChangedToPlayers(game)
  })

  socket.on(Endpoints.CHANGE_MISTER_X, misterXLocalId =>{
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    let game = ActiveGamesManager.getActiveGameById(user.game_id)
    if (!game || game.status !== 0) return null
    let success = game.setMisterX(user.user_id, misterXLocalId)
    if (!success) return null
    game.saveToFile()
    sendLobbyChangedToPlayers(game)
  })

  socket.on(Endpoints.START_GAME, ()=>{
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    let game = ActiveGamesManager.getActiveGameById(user.game_id)
    if (!game || game.status !== 0) return null
    let success = game.startGame()
    if (success){
      game.saveToFile()
      emitToPlayers(game, Endpoints.START_GAME, game.getGame())
    }
  })

  socket.on('disconnect', () => {
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    if (!user) return null
    let game = ActiveGamesManager.getActiveGameById(user.game_id)
    if (game){
      if (game.status === 0){
        let success = game.removePlayer(user.user_id)
        if (success === "game_deleted"){
          //manda segnale di partita eliminata
          let gameUsers = ActiveUsersManager.getUsersByGameId(game.id)
          gameUsers.forEach(player => {
            if (player){
              let s = io.sockets.connected[player.session_id]
              if (s) s.emit(Endpoints.LOBBY_MODIFIED, {status: 3});
            }

          })
        }
      if (success === "user_deleted"){
        game.saveToFile()
        sendLobbyChangedToPlayers(game)
      }


      }else{
        //send user offline, chenage user status
      }
    }else{

    }
    //socket.broadcast.emit('user-disconnected', users[socket.id])
    ActiveUsersManager.saveUserList(ActiveUsersManager.removeUserBySessionId(socket.id))
    //remove from game if game is in lobby else send notification to players
  })
})

function sendLobbyChangedToPlayers(game){
  let gameUsers = ActiveUsersManager.getUsersByGameId(game.id)
  gameUsers.forEach(player => {
    if (player){
      let s = io.sockets.connected[player.session_id]
      if (s) s.emit(Endpoints.LOBBY_MODIFIED, game.getGame(player.user_id));
    }

  })
}

function emitToPlayers(game, endpoint, message){
  let gameUsers = ActiveUsersManager.getUsersByGameId(game.id)
  gameUsers.forEach(player => {
    if (player){
      let s = io.sockets.connected[player.session_id]
      if (s){
        s.emit(endpoint, message);
      }
    }
  })
}
http.listen(3000, () => {
  console.log('listening on *:3000');
});