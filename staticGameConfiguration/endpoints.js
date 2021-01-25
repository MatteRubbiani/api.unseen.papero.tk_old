class Endpoints{
    static CONNECT_TO_GAME = "connect-to-game" //tutto a chi a chiesto, se mister-x bla bla
    static QUIT_GAME = "quit-game"
    static KICK_FROM_GAME = "kick-from-game"
    static JOIN_GAME = "join-game" //mando tutti i giocatori
    static CHANGE_COLOR = "change-color" //{user_id: color}
    static CHANGE_MISTER_X = "change-mister-x" //mando tutti i giocatori
    static LOBBY_MODIFIED = "lobby-modified"
    static START_GAME = "start-game" //status...tutte le info
    static MOVE = "move" //{user_id: x, position: y,  players_turn: z}
    static MOVE_MISTER_X = "move-mister-x" //{_from: x, _to: y, transport, //{//{user_id: x, players_turn: y, last_moves:(null) [(dall'ultima rivelazione,)
                                    // move: {_from:, _to: transport:,}]}
    static END_GAME = "end-game"
}

module.exports = Endpoints