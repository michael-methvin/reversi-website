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

});


