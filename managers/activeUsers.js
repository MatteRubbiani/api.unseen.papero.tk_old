const fs = require('fs');

class ActiveUsersManager{
    static activeUsersPath = './data/activeUsers.json';
    constructor() {

    }

    static getActiveUsersJson(){
        let allUsersRaw = fs.readFileSync(this.activeUsersPath)
        let allUsers = JSON.parse(allUsersRaw)
        return allUsers
    }

    static createActiveUser(game_id, user_id, session_id, username){
        const u_json = {
            game_id: game_id,
            user_id: user_id,
            session_id: session_id,
            username: username
        }
        return u_json
    }

    static addActiveUser(gameId, userId, sessionId, username){
        if (!(gameId != ""  & userId != "" & sessionId != "")){
            console.log("Fields missing, not adding")
            return
        }
        const allUsers = this.removeUserById(userId)
        allUsers.push(this.createActiveUser(gameId, userId, sessionId, username))
        this.saveUserList(allUsers)
    }

    static removeUserById(userId){
            var allUsers =  this.getActiveUsersJson()
            var newAllUsers = []
            for (var i = 0; i<allUsers.length; i++){
                if (allUsers[i].user_id != userId){
                    newAllUsers.push(allUsers[i])
                } else {
                    //console.log("eilminato")
                }
            }
            return newAllUsers
    }

    static removeUserBySessionId(sessionId){
        var allUsers =  this.getActiveUsersJson()
        var newAllUsers = []
        for (var i = 0; i<allUsers.length; i++){
            if (allUsers[i].session_id !== sessionId){
                newAllUsers.push(allUsers[i])
            } else {
                //console.log("eilminato")
            }
        }
        return newAllUsers
    }

    static saveUserList(userList){
        let data = JSON.stringify(userList);
        fs.writeFileSync(this.activeUsersPath, data)
    }

    static findActiveUserById(userId){
        const allUsers = this.getActiveUsersJson()
        for (let i=0; i<allUsers.length; i++){
            let user = allUsers[i]
            if (user.user_id === userId){
                return user
            }
        }
        return null
    }

    static findActiveUserBySessionId(sessionId){
        const allUsers = this.getActiveUsersJson()
        var user
        for (const i in allUsers){
            user = allUsers[i]
            if (user.session_id.toString() === sessionId.toString()) {
                return user
            }
        }
        return null
    }

    static getUsersByGameId(gameId){
        const allUsers = this.getActiveUsersJson()
        let users = []
        allUsers.forEach(user => {if (user.game_id === gameId) users.push(user)})
        return users
    }


}

module.exports = ActiveUsersManager
