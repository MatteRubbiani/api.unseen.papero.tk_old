const io = require('socket.io')(3000)
const ActiveUsersManager = require("./managers/activeUsers")
const PathsManager = require("./staticGameConfiguration/paths")
const ActiveGamesManager = require("./managers/activeGames")
const Endpoints = require("./staticGameConfiguration/endpoints")

io.on('connection', socket => {
  socket.on(Endpoints.CONNECT_TO_GAME, data => {
    let user_id = data["user_id"]
    let game_id = data["game_id"]
    let username = data["username"]
    ActiveUsersManager.addActiveUser(game_id, user_id, socket.id, username)
    let game = ActiveGamesManager.getActiveGameById(game_id)
    if (!game){
      game = ActiveGamesManager.createActiveGame(user_id, game_id)
      game.saveToFile()
    }
    socket.emit(Endpoints.CONNECT_TO_GAME, game.getGame(user_id))
  })

  socket.on(Endpoints.JOIN_GAME, ()=> {
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    let game = ActiveGamesManager.getActiveGameById(user.game_id)
    if (!game || game.status !== 0) return null
    game.saveToFile()
    let success = game.addPlayer(user.user_id)
    if (!success) return null
    sendLobbyChangedToPlayers(game)
  })

  socket.on(Endpoints.CHANGE_COLOR, color => {
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    let game = ActiveGamesManager.getActiveGameById(user.game_id)
    if (!game || game.status !== 0) return null
    let success = game.setColor(user.user_id, parseInt(color))
    if (!success) return null
    game.saveToFile()
    sendLobbyChangedToPlayers(game)
  })

  socket.on(Endpoints.CHANGE_MISTER_X, misterXId =>{
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    let game = ActiveGamesManager.getActiveGameById(user.game_id)
    if (!game || game.status !== 0) return null
    let success = game.setMisterX(user.user_id, misterXId)
    if (!success) return null
    game.saveToFile()
    sendLobbyChangedToPlayers(game)
  })


  socket.on('disconnect', () => {
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    let game = ActiveGamesManager.getActiveGameById(user.game_id)
    if (game){
      if (game.status === 0){
        let success = game.removePlayer(user.user_id)
        if (success) sendLobbyChangedToPlayers(game)
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
  gameUsers.forEach(player =>{
    io.sockets.connected[player.session_id].emit(Endpoints.LOBBY_MODIFIED, game.getGame(player.user_id));
  })
}

function emitToPlayers(game, endpoint, message){
  let gameUsers = ActiveUsersManager.getUsersByGameId(game.id)
  gameUsers.forEach(player =>{
    io.sockets.connected[player.session_id].emit(endpoint, message);
  })
}



