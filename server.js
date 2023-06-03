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

});


