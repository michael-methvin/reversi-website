//* Set up the static file server *//

let static =  require('node-static');


//* Set up the http server library *//

let http = require('http');

//* Assume that we are running on heroku *//
let port = process.env.PORT;
let directory = __dirname + '/public';


//* If we aren't on Heroku then we need to adjust the port/directory*//
if((typeof port == 'undefined') || (port === null)) {
    port = 8080;
    directory = './public';
}

/* Set up static file web server to deliver files from the filesystem */
let file = new static.Server(directory);

let app = http.createServer(
    function(request,response) {
        request.addListener('end',
                function() {
                    file.serve(request,response);
                }
        ).resume();
    }
).listen(port);

/* Confirming server up and running*/
console.log('The server is running');


/*******************************/
/* Setting up web socket server*/

const{Server} = require("socket.io");
const io = new Server(app);

io.on('connection',(socket) => {

    /* Output log message on server and send to clients  */
    function serverLog(...messages) {
        io.emit('log', ['**** Message from the server: \n']);
        messages.forEach((item) => {
            io.emit('log', ['****\t' + item]);
            console.log(item);
        })
    }

    serverLog('a page connected to the server: ' + socket.id);

    socket.on('disconnect', () => {
        serverLog('a page disconnected from the server: ' + socket.id);
    });

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
        if((typeof request == 'undefined') || (request === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'no content from client';
            socket.emit('join_room_response', response);
            serverLog('join_room command FAIL', JSON.stringify(response));
            return;
        }

        let room = request.room;
        let username = request.username;

        if((typeof room == 'undefined') || (room === null)) {
            response = {};
            response.result = 'fail';
            response.message = 'no room from client';
            socket.emit('join_room_response', response);
            serverLog('join_room command FAIL', JSON.stringify(response));
            return;
        }
        if((typeof username == 'undefined') || (username === null)) {
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
        io.in(room).fetchSockets().then((sockets)=> {
            serverLog(sockets.length + ' client(s) in : ' + room);
            if((typeof sockets == 'undefined') || (sockets === null) || (!sockets.includes(socket))) {
                response = {};
                response.result = 'fail';
                response.message = 'Server error : Error Joining Chat Room';
                socket.emit('join_room_response', response);
                serverLog('join_room command FAIL', JSON.stringify(response));
            }
            else {
                response = {};
                response.result = 'success';
                response.room = room;
                response.username = username;
                response.count = sockets.length;
                
                // Notify Room that user has connected
                io.of('/').to(room).emit('join_room_response',response);
                serverLog('join_room command SUCCESS', JSON.stringify(response));
            }
        });



   
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
        if((typeof request == 'undefined') || (request === null)) {
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

        if((typeof room == 'undefined') || (room === null)) {
            let response = {};
            response.result = 'fail';
            response.message = 'no room from client';
            socket.emit('send_message_response', response);
            serverLog('send_message command FAIL', JSON.stringify(response));
            return;
        }
        if((typeof username == 'undefined') || (username === null)) {
            let response = {};
            response.result = 'fail';
            response.message = 'no username from client';
            socket.emit('send_message_response', response);
            serverLog('send_message command FAIL', JSON.stringify(response));
            return;
        }
        if((typeof message == 'undefined') || (message === null)) {
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
        io.of('/').to(room).emit('send_message_response',response);
        serverLog('send_message_response SUCCESS', JSON.stringify(response));

   
    });

});


