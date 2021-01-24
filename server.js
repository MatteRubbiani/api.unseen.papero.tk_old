const io = require('socket.io')(3000)
const ActiveUsersManager = require("./managers/activeUsers")
const PathsManager = require("./staticGameConfiguration/paths")
const ActiveGamesManager = require("./managers/activeGames")
const Endpoints = require("./staticGameConfiguration/endponts")

io.on('connection', socket => {

  socket.on("connect-to-game", username_user_and_game_id => {

    ActiveUsersManager.addActiveUser(username_user_and_game_id["game_id"], username_user_and_game_id["user_id"], socket.id, username_user_and_game_id["username"])
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    console.log(user.game_id)
    let game = ActiveGamesManager.getActiveGameById(user.game_id)
    console.log(game)
    if (!game) return null
    return game.getGame()
  })

  socket.on(Endpoints.JOIN_GAME, data=> {
    //ripasso a tutti tutto, ricord di mettere anche local id a tutti diverso
    let user = ActiveUsersManager.findActiveUserBySessionId(socket.id)
    let game = ActiveGamesManager.getActiveGameById(user.game_id)

    if (!game || game.status !== 0) return null
    //TODO: send to everyone user joined message
    let gameUsers = ActiveUsersManager.getUsersByGameId(game.id)
    gameUsers.forEach(player =>{
      io.sockets.connected[player.session_id].emit(Endpoints.JOIN_GAME, game.getGame(player.user_id));
    })
    console.log(game.getGame(user.user_id))
    return ""
  })

  socket.on('disconnect', () => {
    //socket.broadcast.emit('user-disconnected', users[socket.id])
    ActiveUsersManager.saveUserList(ActiveUsersManager.removeUserBySessionId(socket.id))
  })
})



