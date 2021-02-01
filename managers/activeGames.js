const fs = require('fs');
const gameConfig = require("../staticGameConfiguration/gameConfig")
const PathsManager = require("../staticGameConfiguration/paths")
const ActiveUsersManager = require("./activeUsers")

class ActiveGamesUser{
    constructor(userDict) {
        this.user_id = userDict.user_id
        this.local_id = userDict.local_id
        this.is_mister_x = userDict.is_mister_x
        this.position = userDict.position
        this.color = userDict.color
        this.used_taxi = userDict.used_taxi
        this.used_bus = userDict.used_bus
        this.used_underground = userDict.used_underground
        this.online = userDict.online
    }

    move(_from, _to, transport) {
        if (_from !== this.position) {
            console.log("position not valid")
            return false
        }
        if (PathsManager.verify(_from, _to, transport)){
            this.position = _to
            return true
        }
        return false
    }
}

class ActiveGamesMisterX{
    constructor(misterXDict) {
        this.double_turns_used = parseInt(misterXDict.double_turns_used)
        this.secret_moves_used = parseInt(misterXDict.secret_moves_used)
    }
}

class ActiveGamesMove{
    constructor(movesDict) {
        this.user_id = movesDict.user_id
        this._from = movesDict._from
        this._to = movesDict._to
        this.transport = movesDict.transport
    }
}

class ActiveGamesManager{
    static  activeGamesPath = './data/activeGames.json';
    activeGamesPath = './data/activeGames.json';
    constructor(activeGameJson) {
        this.id = activeGameJson.id
        this.status = parseInt(activeGameJson.status)
        this.players_order = activeGameJson.players_order
        this.admin_user_id = activeGameJson.admin_user_id
        this.players = this.createPlayersArray(activeGameJson.players)
        this.total_moves = parseInt(activeGameJson.total_moves)
        this.mister_x = new ActiveGamesMisterX(activeGameJson.mister_x)
        this.moves_record = this.createMovesArray(activeGameJson.moves_record)
    }

    toJson(){
        let json = JSON.stringify(this)
        json = JSON.parse(json)
        delete json["activeGamesPath"]
        return json
    } //funziona

    createPlayersArray(playersArray){
        let players = []
        playersArray.forEach(userDict =>{ if (userDict) players.push(new ActiveGamesUser(userDict))})
        return players
    } //funziona

    getGame(userId){
        let json
        let yourUser = this.getPlayerById(userId)
        let yourLocalId = (yourUser) ? yourUser.local_id : null
        let players = []
        switch (this.status){
            case 0:
                this.players.forEach(player => {
                    let activeUser = ActiveUsersManager.findActiveUserById(player.user_id)
                    let username
                    (activeUser) ? username = activeUser.username : null
                    let p = {
                        local_id: player.local_id,
                        is_mister_x: player.is_mister_x ,
                        color: player.color,
                        is_admin: player.local_id === this.admin_user_id,
                        username: username
                    }
                    //console.log(ActiveUsersManager.findActiveUserById(player.user_id))
                    players.push(p)
                })
                json = {
                    status: 0,
                    your_local_id: yourLocalId,//null se non in partita
                    players: players,
                }
                return json
            case 1:
                let playersTurn = this.getPlayersTurn()
                let isRevelationTurn = this.isRevelationTurn()
                players = this.getPlayersInGame(this.getMisterXPlayer().user_id === userId)
                let misterXMoves = this.getMisterXTransportList()
                let lastKnownPosition = this.getMisterXLastKnowPosition()
                json = {
                    status: 1,
                    your_local_id: yourLocalId,
                    players_turn: playersTurn,
                    is_revelation_turn: isRevelationTurn,
                    players: players,
                    mister_x_moves:misterXMoves,
                    last_known_position: lastKnownPosition
                }
                return json
            case 2:
                //TODO: ...

        }
    }

    getMisterXPlayer(){
        for (let i=0; i<this.players.length; i++){
            if (this.players[i].is_mister_x) return this.players[i]
        }
        return null
    } //funziona

    setMisterX(adminId, localId){
        if (adminId !== this.getPlayerByLocalId(this.admin_user_id).user_id){
            return null
        }
        let userId = this.getPlayerByLocalId(localId).user_id
        let changed = false
        let new_index = -1; let old_index = -1;
        for (let i=0; i<this.players.length;i++){
            if (this.players[i].is_mister_x)  old_index = i
            if (this.players[i].user_id === userId) new_index = i
        }
        if (new_index !== -1){
            this.players[new_index].is_mister_x = true
            this.players[new_index].color = -1
            if(old_index !== -1){
                this.players[old_index].is_mister_x = false
                this.players[old_index].color = this.findFirstAvailableColor()
            }
            changed = true
        }
        return changed
    } //funziona

    createMovesArray(movesArray){
        var moves = []
        movesArray.forEach(moveDict => moves.push(ActiveGamesMove(moveDict)))
        return moves
    }

    addPlayer(userId){
        if (this.getPlayerById(userId)) return null
        const userDict = {
            user_id: userId,
            local_id: Date.now(),
            is_mister_x: false,
            position: 1,
            color: this.findFirstAvailableColor(),
            used_taxi: 0,
            used_bus: 0,
            used_underground: 0,
            online: true
        }
        this.players.push(new ActiveGamesUser(userDict))
        this.players_order.push(userId)
        return true
    } //funziona

    removePlayer(userId){
        for (let i=0; i<this.players.length; i++){
            if (this.players[i].user_id === userId){
                if (this.players.length < 2){
                    this.deleteGame()
                    console.log("gioco eliminato")
                    return "game_deleted"
                }
                if(this.players[i].local_id === this.admin_user_id){
                    this.players.splice(i, 1)
                    this.admin_user_id = this.players[0] ? this.players[0].local_id : this.players[1].local_id
                }else{
                    this.players.splice(i, 1)
                }
                //togli da lista
                return "user_deleted"
            }
        }
        return null
    }

    getPlayerById(playerId){ //funziona
        for (let i=0; i<this.players.length;i++){
            if (this.players[i].user_id === playerId){
                return this.players[i]
            }
        }
        return null
    }

    getPlayerByLocalId(localId){
        for (let i=0; i<this.players.length;i++){
            if (this.players[i].local_id === localId){
                return this.players[i]
            }
        }
        return null
    }

    findFirstAvailableColor(){
        let isUsed
        for (let i=0; i<20; i++){
            isUsed = false
            for (let j=0; j<this.players.length; j++){
                if(this.players[j].color == i){
                    isUsed = true
                }
            }
            if (!isUsed) return i
        }
    } //funziona

    setColor(userId, color = null){
        let c
        if (!color){
            c = this.findFirstAvailableColor()
        }else{
            for (let i=0; i<this.players.length; i++){
                if(this.players[i].color == color) return null
            }
            c = color
        }
        for (let i=0; i<this.players.length; i++){
            if (this.players[i].user_id === userId){
                this.players[i].color = c
                return true
            }
        }
        return null
    }

    //GAME IS STARTING
    startGame(){
    if (this.status !== 0) return null
        this.status = 1
        this.players_order = this.createRandomPlayersOrderMisterXFirst()
        let players_possible_pos = this.shuffle(gameConfig.possible_player_starting_positions)
        if (!this.getMisterXPlayer()) return null
        for (let i=0; i<this.players.length; i++){
            if (this.players[i].is_mister_x){
                this.players[i].position = gameConfig.possible_mister_x_starting_positions[Math.floor(Math.random() * gameConfig.possible_mister_x_starting_positions.length)];
            }else{
                this.players[i].position = players_possible_pos[i]
            }
        }
        return true

    }

    createRandomPlayersOrderMisterXFirst(){
        let order = []
        let mister_x = this.getMisterXPlayer()
        order.push(mister_x.local_id)
        let players_no_m_x = []
        this.players.forEach(player => {
            if (!player.is_mister_x) players_no_m_x.push(player.local_id)
        })
        players_no_m_x = this.shuffle(players_no_m_x)
        players_no_m_x.forEach(p=>order.push(p))
        return order
    }

    shuffle(array) {
        let currentIndex = array.length, temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

    //GAME HAS STARTED

    movePlayer(userId, _from, _to, transport){
        for (let i=0; i<this.players.length; i++){
            if (this.players[i].user_id === userId){
                let success = this.players[i].move(_from, _to, transport)
                console.log(success)
                if (success){
                    this.total_moves += 1

                }
            }
        }
    }

    addMoveToRecord(userId, _from, _to, transport){
        let moveJ = {
            user_id: userId,
            _from: _from,
            _to: _to,
            transport: transport
        }
        let move =
        this.moves_record

    }

    getMisterXMoves(){
        let moves = []
        this.moves_record.forEach(move =>{if (move.user_id === this.getMisterXUserId()) moves.push(move)})
        return moves
    }

    getMisterXTransportList(){
        let transports = []
        this.getMisterXMoves().forEach(move =>{transports.push(move.transport)})
        return transports
    }

    getMisterXLastKnowPosition(){
        let revelationTurns = gameConfig.mister_x_is_visible_turns
        let misterXMoves = this.getMisterXMoves()
        for (let i=misterXMoves.length; i>=0; i--){
            if (revelationTurns.includes(i+1)) return misterXMoves[i]._to
        }
    }

    isRevelationTurn(){
        let cleanMoves = this.total_moves - this.mister_x.double_turns_used
        let playersNumber = this.players.length
        let turnsPlayed = Math.floor(cleanMoves / playersNumber)
        let misterXPlayedTurns = turnsPlayed + this.mister_x.double_turns_used
        return gameConfig.mister_x_is_visible_turns.includes(misterXPlayedTurns)
    }

    getPlayersTurn(){
        let allMovesNumber = this.moves_record.length
        let cleanMovesNumber = allMovesNumber - this.mister_x.double_turns_used
        return cleanMovesNumber % this.players.length
    }

    getPlayersInGame(forMisterX=false){
        let players = []
        this.players.forEach(player =>{
            let position
            if (player.is_mister_x){
                if (forMisterX){
                    position = player.position
                }else{
                    position = null
                }
            }else{
                position = player.position
            }
            players.push({
                local_id: player.local_id,
                is_mister_x: player.is_mister_x,
                color: player.color,
                is_admin: player.local_id === this.admin_user_id,
                position: position, //null, se non misterX
                username: ActiveUsersManager.findActiveUserById(player.user_id).username
            })
        })
        return players
    } //funziona

    static getActiveGameById(gameId){
        const allGames = this.getActiveGamesJson()
        for (let i=0; i<allGames.length; i++){
            if (allGames[i].id === gameId){
                return new ActiveGamesManager(allGames[i])
            }
        }
    } //funziona

    static createActiveGame(userId, gameId){
        let activeGame = this.getActiveGameById(gameId)
        if (activeGame){
            return
        }
        const newGame = {
            id: gameId,
            status: 0,
            players_order: [userId], //mister x will be first
            admin_user_id: 0,
            players: [
                {
                    local_id: 0,
                    user_id: userId,
                    is_mister_x: true,
                    position: 1,
                    color: -1,
                    used_taxi: 0,
                    used_bus: 0,
                    used_underground: 0,
                    online: true
                }
            ],
            total_moves: 0,
            mister_x: {
                double_turns_used: 0,
                secret_moves_used: 0
            },

            moves_record: []
        }
        return new ActiveGamesManager(newGame)
    } //funziona

    static getActiveGamesJson(){
        let allGamesRaw = fs.readFileSync(this.activeGamesPath)
        return JSON.parse(allGamesRaw)
    } //funziona

    deleteGame(){
        let data = JSON.parse(fs.readFileSync(this.activeGamesPath))
        let new_data = []
        for (let i=0; i<data.length; i++){
            if (data[i].id !== this.id){
                new_data.push(data[i])
            }
        }
        new_data = JSON.stringify(data)
        fs.writeFileSync(this.activeGamesPath, new_data)
    }

    saveToFile(){
        let data = JSON.parse(fs.readFileSync(this.activeGamesPath))
        let exists = false
        for (let i=0; i<data.length; i++){
            if (data[i].id == this.id){
                data[i] = this.toJson()
                exists = true
            }
        }
        if (!exists) data.push(this.toJson())
        data = JSON.stringify(data)
        fs.writeFileSync(this.activeGamesPath, data)
    } //funziona
}

module.exports = ActiveGamesManager
