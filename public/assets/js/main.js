function getIRIParameterVal(requestedKey) {

    let pageIRI = window.location.search.substring(1);
    let pageIRIVariables = pageIRI.split('&');
    
    for(let i = 0; i < pageIRIVariables.length; i++) {
        
        let data = pageIRIVariables[i].split('=');
        let key = data[0];
        let value = data[1];
        
        if(key === requestedKey) {
            return value;
        }
    }
}

let username = decodeURI(getIRIParameterVal('username'));

if ((typeof username == 'undefined') || (username === null) || (username == '')) {
    username = "Anonymous_" + Math.floor(Math.random()*1000);
}

let chatRoom = 'Lobby';





$('#welcome').prepend('<h3>Welcome to the Lobby, ' + username+'</h3>');

// Set up socket.io connection to the server
let socket = io();
socket.on('log', function(array) {
    console.log.apply(console,array);
});

socket.on('join_room_response', (response) => {
    if((typeof response == 'undefined') || (response === null)) {
        console.log('Server did not receive response')
        return;
    }
    if(response ==='fail') {
        console.log(response.message);
        return;
    }

    let newString = '<p class = \'join_room_response\'> ' + response.username + ' joined the ' + response.room + '. (' +response.count + ' user(s) in the room.)</p>';
    
    $('#messages').prepend(newString);

});



function sendMessage() {
    let request = {};
    request.room = chatRoom;
    request.username = username;
    request.message = $('#chatMessage').val(); 

    console.log('**** Client log message, sending \'send_message\' command: ' +JSON.stringify(request));

    socket.emit('send_message', request);
}

socket.on('send_message_response', (response) => {
    if((typeof response == 'undefined') || (response === null)) {
        console.log('Server did not receive response')
        return;
    }
    if(response ==='fail') {
        console.log(response.message);
        return;
    }

    let newString = '<p class = \'send_message_response\'> <b>' + response.username + '</b>: ' + response.message + '</p>';
    
    $('#messages').prepend(newString);

});

// Request to join chat room

$( () =>{
    let request = {};
    request.room = chatRoom;
    request.username = username;
    console.log('**** Client log message, sending \'join_room\' command: ' +JSON.stringify(request));
    socket.emit('join_room', request);
});