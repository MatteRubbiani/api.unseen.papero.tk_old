const io = require('socket.io')(3000)
const ActiveUsersManager = require("./managers/activeUsers")
const PathsManager = require("./staticGameConfiguration/paths")
const ActiveGamesManager = require("./managers/activeGames")
const Endpoints = require("./staticGameConfiguration/endponts")

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
    let gameUsers = ActiveUsersManager.getUsersByGameId(game.id)
    gameUsers.forEach(player =>{
      io.sockets.connected[player.session_id].emit(Endpoints.JOIN_GAME, game.getGame(player.user_id));
    })
  })

  socket.on('disconnect', () => {
    //socket.broadcast.emit('user-disconnected', users[socket.id])
    ActiveUsersManager.saveUserList(ActiveUsersManager.removeUserBySessionId(socket.id))
  })
})



