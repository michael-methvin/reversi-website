//* Set up the static file server *//

let static = require('node-static');


//* Set up the http server library *//

let http = require('http');

//* Assume that we are running on heroku *//
let port = process.env.PORT;
let directory = __dirname + '/public';


//* If we aren't on Heroku then we need to adjust the port/directory*//
if ((typeof port == 'undefined') || (port === null)) {
    port = 8080;
    directory = './public';
}

/* Set up static file web server to deliver files from the filesystem */
let file = new static.Server(directory);

let app = http.createServer(
    function (request, response) {
        request.addListener('end',
            function () {
                file.serve(request, response);
            }
        ).resume();
    }
).listen(port);

/* Confirming server up and running*/
console.log('The server is running');


/* Set up player registry information and socketIds */
let players = []

/*******************************/
/* Setting up web socket server*/

const { Server } = require("socket.io");
const io = new Server(app);

io.on('connection', (socket) => {

    /* Output log message on server and send to clients  */
    function serverLog(...messages) {
        io.emit('log', ['**** Message from the server: \n']);
        messages.forEach((item) => {
            io.emit('log', ['****\t' + item]);
            console.log(item);
        })
    }

    serverLog('a page connected to the server: ' + socket.id);

    /* join_room command handler
    * expected request:
    *   {
    *       'room'     : the room to be joined,
    *       'username' : name of the user joining room
    * 
    *   }
    *
    * expected response:
    *   {
    *       'result'   : 'success',
    *       'room'     : 'room joined',
    *       'username' : the user that joined,
    *       'count'    : num of user present in room
    *       'socket_id': the socket of the user that joined
    *   }
    * 
    *   OR
    *   
    *   {
    *       'result'   : 'fail',
    *        'message' : reason for failure
    *   }
    */

    socket.on('join_room', (request) => {
        serverLog('Server received a command', '\'join_room\'', JSON.stringify(request));


        // Request Validation
        if ((typeof request == 'undefined') || (request === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'no content from client';
            socket.emit('join_room_response', response);
            serverLog('join_room command FAIL', JSON.stringify(response));
            return;
        }

        let room = request.room;
        let username = request.username;

        if ((typeof room == 'undefined') || (room === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'no room from client';
            socket.emit('join_room_response', response);
            serverLog('join_room command FAIL', JSON.stringify(response));
            return;
        }
        if ((typeof username == 'undefined') || (username === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'no username from client';
            socket.emit('join_room_response', response);
            serverLog('join_room command FAIL', JSON.stringify(response));
            return;
        }

        // Handle command
        socket.join(room);

        // Confirm client in room
        io.in(room).fetchSockets().then((sockets) => {
            if ((typeof sockets == 'undefined') || (sockets === null) || (!sockets.includes(socket))) {
                response = {};
                response.result = 'fail';
                response.message = 'Server error : Error Joining Chat Room';
                socket.emit('join_room_response', response);
                serverLog('join_room command FAIL', JSON.stringify(response));
            }
            else {
                players[socket.id] = {
                    username: username,
                    room: room
                }

                /*Announce to everyone in the room the other players in the room*/
                for (const member of sockets) {
                    response = {
                        result: 'success',
                        socket_id: member.id,
                        room: players[member.id].room,
                        username: players[member.id].username,
                        count: sockets.length

                    }

                    // Notify Room that user has connected
                    io.of('/').to(room).emit('join_room_response', response);
                    serverLog('join_room command SUCCESS', JSON.stringify(response));
                    if(room !== "Lobby") {
                        send_game_update(socket,room,'initial update');
                    }

                }
            }
        });




    });

    socket.on('invite', (request) => {
        serverLog('Server received a command', '\'invite\'', JSON.stringify(request));


        // Request Validation
        if ((typeof request == 'undefined') || (request === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'no content from client';
            socket.emit('invite_response', response);
            serverLog('invite command FAIL', JSON.stringify(response));
            return;
        }

        let requested_user = request.requested_user;
        let room = players[socket.id].room;
        let username = players[socket.id].username;

        if ((typeof requested_user == 'undefined') || (requested_user === null) || (requested_user === '')) {
            response = {};
            response.result = 'fail';
            response.message = 'no requested_user from client';
            socket.emit('invite_response', response);
            serverLog('invite_response command FAIL', JSON.stringify(response));
            return;
        }
        if ((typeof room == 'undefined') || (room === null) || (room === '')) {
            response = {};
            response.result = 'fail';
            response.message = 'invited_user has no room';
            socket.emit('invite_response', response);
            serverLog('invite_response command FAIL', JSON.stringify(response));
            return;
        }
        if ((typeof username == 'undefined') || (username === null) || (username === '')) {
            response = {};
            response.result = 'fail';
            response.message = 'Invited user does not have username';
            socket.emit('invite_response', response);
            serverLog('invite_response command FAIL', JSON.stringify(response));
            return;
        }

        // Make sure that the invited player is present in the room

        // Confirm client in room
        io.in(room).allSockets().then((sockets) => {

            // Invitee isn't in the room
            if ((typeof sockets == 'undefined') || (sockets === null) || (!sockets.has(requested_user))) {
                response = {};
                response.result = 'fail';
                response.message = 'Server error : Error Inviting Player';
                socket.emit('invite_response', response);
                serverLog('invite_response command FAIL', JSON.stringify(response));
            }

            // Invitee is in the room
            else {
                response = {
                    result: 'success',
                    socket_id: requested_user
                }
                socket.emit('invite_response', response);

                response = {
                    result: 'success',
                    socket_id: socket.id
                }
                socket.to(requested_user).emit('invited', response)
                serverLog('invite command succeeded', JSON.stringify(response));
            }
        });




    });

    socket.on('uninvite', (request) => {
        serverLog('Server received a command', '\'uninvite\'', JSON.stringify(request));


        // Request Validation
        if ((typeof request == 'undefined') || (request === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'no content from client';
            socket.emit('uninvited', response);
            serverLog('uninvited command FAIL', JSON.stringify(response));
            return;
        }

        let requested_user = request.requested_user;
        let room = players[socket.id].room;
        let username = players[socket.id].username;

        if ((typeof requested_user == 'undefined') || (requested_user === null) || (requested_user === '')) {
            response = {};
            response.result = 'fail';
            response.message = 'no requested_user from client';
            socket.emit('uninvited', response);
            serverLog('uninvited command FAIL', JSON.stringify(response));
            return;
        }
        if ((typeof room == 'undefined') || (room === null) || (room === '')) {
            response = {};
            response.result = 'fail';
            response.message = 'uninvited_user has no room';
            socket.emit('uninvited', response);
            serverLog('uninvited command FAIL', JSON.stringify(response));
            return;
        }
        if ((typeof username == 'undefined') || (username === null) || (username === '')) {
            response = {};
            response.result = 'fail';
            response.message = 'Uninvited user does not have username';
            socket.emit('uninvited', response);
            serverLog('uninvited command FAIL', JSON.stringify(response));
            return;
        }

        // Make sure that the uninvited player is present in the room

        // Confirm client in room
        io.in(room).allSockets().then((sockets) => {

            // Uninvited player isn't in the room
            if ((typeof sockets == 'undefined') || (sockets === null) || (!sockets.has(requested_user))) {
                response = {};
                response.result = 'fail';
                response.message = 'Server error : Error Uninviting Player';
                socket.emit('uninvited', response);
                serverLog('uninvited command FAIL', JSON.stringify(response));
            }

            // Invitee is in the room
            else {
                response = {
                    result: 'success',
                    socket_id: requested_user
                }
                socket.emit('uninvited', response);

                response = {
                    result: 'success',
                    socket_id: socket.id
                }
                socket.to(requested_user).emit('uninvited', response)
                serverLog('uninvited command succeeded', JSON.stringify(response));
            }
        });




    });

    socket.on('game_start', (request) => {
        serverLog('Server received a command', '\'game_start\'', JSON.stringify(request));


        // Request Validation
        if ((typeof request == 'undefined') || (request === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'no content from client';
            socket.emit('game_start_response', response);
            serverLog('game_start command FAIL', JSON.stringify(response));
            return;
        }

        let requested_user = request.requested_user;
        let room = players[socket.id].room;
        let username = players[socket.id].username;

        if ((typeof requested_user == 'undefined') || (requested_user === null) || (requested_user === '')) {
            response = {};
            response.result = 'fail';
            response.message = 'no requested_user from client';
            socket.emit('game_start_response', response);
            serverLog('game_start command FAIL', JSON.stringify(response));
            return;
        }
        if ((typeof room == 'undefined') || (room === null) || (room === '')) {
            response = {};
            response.result = 'fail';
            response.message = 'no room present';
            socket.emit('game_start_response', response);
            serverLog('game_start command FAIL', JSON.stringify(response));
            return;
        }
        if ((typeof username == 'undefined') || (username === null) || (username === '')) {
            response = {};
            response.result = 'fail';
            response.message = 'Invited user does not have username';
            socket.emit('game_start_response', response);
            serverLog('game_start command FAIL', JSON.stringify(response));
            return;
        }

        // Make sure that the player is in room

        // Confirm client in room
        io.in(room).allSockets().then((sockets) => {

            // Uninvited player isn't in the room
            if ((typeof sockets == 'undefined') || (sockets === null) || (!sockets.has(requested_user))) {
                response = {};
                response.result = 'fail';
                response.message = 'Server error : Player invited no longer in the room to play';
                socket.emit('game_start_response', response);
                serverLog('game_start command FAIL', JSON.stringify(response));
            }

            // The player is present
            else {
                let game_id = Math.floor(1 + Math.random() * 0x100000.toString(16));
                response = {
                    result: 'success',
                    game_id: game_id,
                    socket_id: requested_user
                }
                socket.emit('game_start_response', response);

                socket.to(requested_user).emit('game_start_response', response)
                serverLog('game_start command succeeded', JSON.stringify(response));
            }
        });




    });

socket.on('disconnect', () => {

    if ((typeof players[socket.id] != 'undefined') && (players[socket.id] != null)) {
        let response = {
            username: players[socket.id].username,
            room: players[socket.id].room,
            count: Object.keys(players).length - 1,
            socket_id: socket.id
        };
        let room = players[socket.id].room;
        delete players[socket.id];

        // tell everyone who left
        io.of('/').to(room).emit('player_disconnected', response);
        serverLog('player successfully disconnected ', JSON.stringify(response));

    }



});




/* send_message command handler
* expected request:
*   {
*       'room'     : the room to send message,
*       'username' : name of the user sending message
*       'message'  : message to broadcast
* 
*   }
*
* expected response:
*   {
*       'result'   : 'success',
*       'username' : the user that sent the message,
*       'message'  : message broadcasted
*   }
* 
*   OR
*   
*   {
*       'result'   : 'fail',
*        'message' : reason for failure
*   }
*/

socket.on('send_message', (request) => {
    serverLog('Server received a command', '\'send_message\'', JSON.stringify(request));


    // Request Validation
    if ((typeof request == 'undefined') || (request === null)) {
        let response = {};
        response.result = 'fail';
        response.message = 'no content from client';
        socket.emit('send_message_response', response);
        serverLog('send_message command FAIL', JSON.stringify(response));
        return;
    }

    let room = request.room;
    let username = request.username;
    let message = request.message;

    if ((typeof room == 'undefined') || (room === null)) {
        let response = {};
        response.result = 'fail';
        response.message = 'no room from client';
        socket.emit('send_message_response', response);
        serverLog('send_message command FAIL', JSON.stringify(response));
        return;
    }
    if ((typeof username == 'undefined') || (username === null)) {
        let response = {};
        response.result = 'fail';
        response.message = 'no username from client';
        socket.emit('send_message_response', response);
        serverLog('send_message command FAIL', JSON.stringify(response));
        return;
    }
    if ((typeof message == 'undefined') || (message === null)) {
        let response = {};
        response.result = 'fail';
        response.message = 'no message from client';
        socket.emit('send_message_response', response);
        serverLog('send_message command FAIL', JSON.stringify(response));
        return;
    }

    // Handle command

    let response = {};
    response.result = 'success';
    response.username = username;
    response.room = room;
    response.message = message;

    // Tell everyone in room message
    io.of('/').to(room).emit('send_message_response', response);
    serverLog('send_message_response SUCCESS', JSON.stringify(response));


});
socket.on('play_token', (request) => {
    serverLog('Server received a command', '\'play_token\'', JSON.stringify(request));

    // Request Validation
    if ((typeof request == 'undefined') || (request === null)) {
        let response = {};
        response.result = 'fail';
        response.message = 'no content from client';
        socket.emit('play_token_response', response);
        serverLog('play_token command FAIL', JSON.stringify(response));
        return;
    }

    let player = players[socket.id];

    if ((typeof player == 'undefined') || (player === null)) {
        let response = {};
        response.result = 'fail';
        response.message = 'play_token from unregistered player';
        socket.emit('play_token_response', response);
        serverLog('play_token command FAIL', JSON.stringify(response));
        return;
    }
    let username = player.username;

    if ((typeof username == 'undefined') || (username === null)) {
        let response = {};
        response.result = 'fail';
        response.message = 'no username from play_token command';
        socket.emit('play_token_response', response);
        serverLog('play_token command FAIL', JSON.stringify(response));
        return;
    }
    let game_id = player.room;

    if ((typeof game_id == 'undefined') || (game_id === null)) {
        let response = {};
        response.result = 'fail';
        response.message = 'There was no valid game associated with the play token command';
        socket.emit('play_token_response', response);
        serverLog('play_token command FAIL', JSON.stringify(response));
        return;
    }
    let row = request.row;
    if ((typeof row == 'undefined') || (row === null)) {
        let response = {};
        response.result = 'fail';
        response.message = 'There was no valid row associated with the play token command';
        socket.emit('play_token_response', response);
        serverLog('play_token command FAIL', JSON.stringify(response));
        return;
    }
    let col = request.column;

    if ((typeof col == 'undefined') || (col === null)) {
        let response = {};
        response.result = 'fail';
        response.message = 'There was no valid column associated with the play token command';
        socket.emit('play_token_response', response);
        serverLog('play_token command FAIL', JSON.stringify(response));
        return;
    }
    let token = request.token;
    if ((typeof token == 'undefined') || (token === null)) {
        let response = {};
        response.result = 'fail';
        response.message = 'There was no valid token associated with the play token command';
        socket.emit('play_token_response', response);
        serverLog('play_token command FAIL', JSON.stringify(response));
        return;
    }
    let game = games[game_id];
    if ((typeof game == 'undefined') || (game === null)) {
        let response = {};
        response.result = 'fail';
        response.message = 'There was no valid game associated with the play token command';
        socket.emit('play_token_response', response);
        serverLog('play_token command FAIL', JSON.stringify(response));
        return;
    }

    // Make sure attempt is correct player

    if(token !== game.whose_turn) {
        let response = {
            result: 'fail',
            message: 'play_token not correct token'
        }
        socket.emit('play_token_response', response);
        serverLog('play_token command FAIL', JSON.stringify(response));
        return;
    }
    // Confirm current play is from expected player
    if(((game.whose_turn === 'heart') && (game.player_heart.socket != socket.id)) || 
       ((game.whose_turn === 'diamond') && (game.player_diamond.socket != socket.id)))  {
        let response = {
            result: 'fail',
            message: 'play_token correct token but wrong person: wrong turn'
        }
        socket.emit('play_token_response', response);
        serverLog('play_token command FAIL', JSON.stringify(response));
        return;
    }

    let response = {
        result: 'success'
    }

    socket.emit('play_token_response', response);

    // execute the move
    if(token === 'heart') {
        game.board[row][col] = 'h';
        flip_tokens('h', row, col, game.board);
        game.whose_turn = 'diamond';
        game.legal_moves = calculate_legal_moves('d',game.board);

    }
    else if (token === 'diamond'){
        game.board[row][col] = 'd';
        flip_tokens('d',row,col,game.board);
        game.whose_turn = 'heart';
        game.legal_moves = calculate_legal_moves('h',game.board);


    }
    send_game_update(socket, game_id, 'played a token');
});



});


//
// Code Relatedd to the Game State
//

let games = [];

function create_new_game() {
    let new_game = {};
    new_game.player_heart = {};
    new_game.player_heart.socket = "";
    new_game.player_heart.username = "";

    new_game.player_diamond = {};
    new_game.player_diamond.socket = "";
    new_game.player_diamond.username = "";

    var d = new Date();
    new_game.last_move_time = d.getTime();

    new_game.whose_turn = 'diamond';

    new_game.board = [
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', 'h', 'd', ' ', ' ', ' '],
        [' ', ' ', ' ', 'd', 'h', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
    ];

    new_game.legal_moves = calculate_legal_moves('d', new_game.board);

    return new_game;


}
function check_line_match(token,dr,dc,r,c,board) {
   
    if(board[r][c] === token) {
        return true;
    }
    if(board[r][c] === ' ') {
        return false;
    }
    // Check to make sure on the board
    // Check for adjacent support on the board
    if ((r + dr < 0) || (r + dr > 7)) {
        return false;
    }
    if((c + dc < 0) || (c + dc > 7)) {
        return false;
    }
    return(check_line_match(token,dr,dc, r + dr, c + dc, board));
}

// return true if r + dr supports play at r and c + dc supports play at c
function adjacent_support(who, dr, dc, r, c, board) {
    let other;
    if(who === 'd') {
        other = 'h';
    }
    else if(who === 'h') {
        other = 'd';
    }
    else {
        console.log("other undefined " + who);
        return false;
    }

    // Check for adjacent support on the board
    if((r + dr < 0) || (r + dr > 7)) {
        return false;
    }
    if((c + dc < 0) || (c + dc > 7)) {
        return false;
    }
    // Check for opposite color present
    if(board[r + dr][c + dc] !== other) {
        return false;
    }
   // Check for space for matching color to capture
   if((r + dr + dr < 0) || (r + dr + dr > 7)) {
    return false;
    }
    if((c + dc + dc < 0) || (c + dc + dc > 7)) {
        return false;
    }

    return check_line_match(who, dr, dc, r + dr + dr, c + dc + dc, board);

}

function calculate_legal_moves(who, board) {
    let legal_moves = [
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
    ];

    for(row =0; row < 8; row++) {
        for(col =0; col < 8; col++) {
            if(board[row][col] === ' ') {
                nw = adjacent_support(who, -1, -1, row, col,board);
                nn = adjacent_support(who, -1, 0, row, col,board);
                ne = adjacent_support(who, -1, 1, row, col,board);
                
                ss = adjacent_support(who, 1, 0, row, col,board);
                sw = adjacent_support(who, 1, -1, row, col,board);
                se = adjacent_support(who, 1, 1, row, col,board);

                ww = adjacent_support(who, 0, -1, row, col,board);
                ee = adjacent_support(who, 0, 1, row, col,board);
                if(nw || nn || ne || ss || sw || se || ww || ee) {
                    legal_moves[row][col] = who;
                }
            }
        }
    }
    return legal_moves;
}
function flip_line(who, dr, dc, r, c,board) {

        if((r + dr < 0) || (r + dr > 7)) {
            return false;
        }
        if((c + dc < 0) || (c + dc > 7)) {
            return false;
        }

        // Check for opposite color present
        if(board[r + dr][c + dc] === ' ') {
            return false;
        }
        if(board[r + dr][c + dc] === who) {
            return true;
        }
        else {
            if(flip_line(who,dr,dc,r+dr,c+dc,board)) {
                board[r+dr][c+dc] = who;
                return true;
            }
            else {
                return false;
            }
        }
}
function flip_tokens(who,row,col,board) {

        flip_line(who, -1, -1, row, col,board);
        flip_line(who, -1, 0, row, col,board);
        flip_line(who, -1, 1, row, col,board);
        
        flip_line(who, 1, 0, row, col,board);
        flip_line(who, 1, -1, row, col,board);
        flip_line(who, 1, 1, row, col,board);

        flip_line(who, 0, -1, row, col,board);
        flip_line(who, 0, 1, row, col,board);
}


function send_game_update(socket, game_id, message) {

    // Make sure that only 2 people in room
    
    // See if game with game_id exists
    if((typeof games[game_id] == 'undefined') || (games[game_id] === null)) {
        console.log("No game exists with game_id: " + game_id + '. Making a new gaem for ' + socket.id);
        games[game_id] = create_new_game();
    }


    // Assign this socket a token
    io.of('/').to(game_id).allSockets().then((sockets) => {
    
        const iterator = sockets[Symbol.iterator]();

        if(sockets.size >= 1) {
            let first = iterator.next().value;
            if((games[game_id].player_heart.socket != first) && (games[game_id].player_diamond.socket != first)) {

                // Player has not been assigned a color yet
                if(games[game_id].player_heart.socket === '') {
                    // This player will be hearts
                    console.log("Hearts assigned to: " + first);
                    games[game_id].player_heart.socket = first;
                    games[game_id].player_heart.username = players[first].username;

                }
                else if(games[game_id].player_diamond.socket === '') {
                    // This player will be diamonds
                    console.log("Diamonds assigned to: " + first);
                    games[game_id].player_diamond.socket = first;
                    games[game_id].player_diamond.username = players[first].username;

                }
                else {
                    // This player should be kicked out
                    console.log("Kicking " + first + " out of the game: " + game_id);
                    io.in(first).socketsLeave([game_id]);
                }
            }
        }
        if(sockets.size >= 2) {
            let second = iterator.next().value;
            if((games[game_id].player_heart.socket != second) && (games[game_id].player_diamond.socket != second)) {

                // Player has not been assigned a color yet
                if(games[game_id].player_heart.socket === '') {
                    // This player will be hearts
                    console.log("Hearts assigned to: " + second);
                    games[game_id].player_heart.socket = second;
                    games[game_id].player_heart.username = players[second].username;

                }
                else if(games[game_id].player_diamond.socket === '') {
                    // This player will be diamonds
                    console.log("Diamonds assigned to: " + second);
                    games[game_id].player_diamond.socket = second;
                    games[game_id].player_diamond.username = players[second].username;

                }
                else {
                    // This player should be kicked out
                    console.log("Kicking " + second + " out of the game: " + game_id);
                    io.in(second).socketsLeave([game_id]);
                }
            }
        }


        // Send game update
        let request = {
            result: 'success',
            game_id: game_id,
            game: games[game_id],
            message: message
        }
        io.of("/").to(game_id).emit('game_update', request);
    })
    
    
    // Check if the game is over
    let legal_moves = 0;
    let heartSum = 0;
    let diamondSum = 0;
    for(let row = 0; row < 8; row++) {
        for(let col = 0; col < 8; col++) {
            if(games[game_id].legal_moves[row][col] !== ' ') {
                legal_moves++;
            }
            if(games[game_id].board[row][col] === 'd') {
                diamondSum++;
            }
            if(games[game_id].board[row][col] === 'h') {
                heartSum++;
            }
        }
    }
    if(legal_moves === 0) {
        let winner = "Tie Game";
        if(diamondSum > heartSum) {
            winner = "diamond"
        }
        if(diamondSum < heartSum) {
            winner = "heart"
        }

        let response = {
            result: 'success',
            game_id: game_id,
            game: games[game_id],
            who_won: winner
        }

        io.in(game_id).emit('game_over', response);

        // Delete old games after on hour
        setTimeout(
            ((id) => {
                return (() => {
                    delete games[id];
                });
            })(game_id), 60 * 60 * 1000
        );
    
    
    }
}

