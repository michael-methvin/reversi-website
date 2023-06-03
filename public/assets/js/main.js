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
    return null;
}

let username = decodeURI(getIRIParameterVal('username'));

if ((typeof username == 'undefined') || (username === null) || (username == 'null') || (username === '')) {
    username = "Anonymous_" + Math.floor(Math.random()*1000);
}

let chatRoom = decodeURI(getIRIParameterVal('game_id'));
if ((typeof chatRoom == 'undefined') || (chatRoom === null) || (chatRoom == 'null')) {
    chatRoom = 'Lobby';
}


// Set up socket.io connection to the server
let socket = io();
socket.on('log', function(array) {
    console.log.apply(console,array);
});


function makeInviteButton(socket_id) {
    let newString = "<button type='button' class='btn btn-secondary'>Invite</button>"
    newNode = $(newString);

    newNode.click( () => {
        let request = {
            requested_user:socket_id
        }
        console.log('**** Client log message, sending \'invite\' command: ' +JSON.stringify(request));
        socket.emit('invite', request);

    });
    return newNode;
}

function makeInvitedButton(socket_id) {
    let newString = "<button type='button' class='btn btn-primary'>Invited</button>"
    newNode = $(newString);
    newNode.click( () => {
        let request = {
            requested_user:socket_id
        }
        console.log('**** Client log message, sending \'uninvite\' command: ' +JSON.stringify(request));
        socket.emit('uninvite', request);

    });
    return newNode;
}

function makePlayButton(socket_id) {
    let newString = "<button type='button' class='btn btn-success'>Play</button>"
    newNode = $(newString);
    newNode.click( () => {
        let request = {
            requested_user:socket_id
        }
        console.log('**** Client log message, sending \'game_start\' command: ' +JSON.stringify(request));
        socket.emit('game_start', request);

    });
    return newNode;
}
function makeStartGameButton() {
    let newString = "<button type='button' class='btn btn-danger'>Starting...</button>"
    newNode = $(newString);
    return newNode;
}

socket.on('invite_response', (response) => {
    if((typeof response == 'undefined') || (response === null)) {
        console.log('Server did not receive response')
        return;
    }
    if(response ==='fail') {
        console.log(response.message);
        return;
    }

    let newNode = makeInvitedButton(response.socket_id);
    $('.socket_' + response.socket_id + ' button').replaceWith(newNode);
});

socket.on('invited', (response) => {
    if((typeof response == 'undefined') || (response === null)) {
        console.log('Server did not receive response')
        return;
    }
    if(response ==='fail') {
        console.log(response.message);
        return;
    }

    let newNode = makePlayButton(response.socket_id);
    $('.socket_' + response.socket_id + ' button').replaceWith(newNode);
});

socket.on('uninvited', (response) => {
    if((typeof response == 'undefined') || (response === null)) {
        console.log('Server did not receive response')
        return;
    }
    if(response ==='fail') {
        console.log(response.message);
        return;
    }

    let newNode = makeInviteButton();
    $('.socket_' + response.socket_id + ' button').replaceWith(newNode);
});

socket.on('game_start_response', (response) => {
    if((typeof response == 'undefined') || (response === null)) {
        console.log('Server did not receive response')
        return;
    }
    if(response ==='fail') {
        console.log(response.message);
        return;
    }

    let newNode = makeStartGameButton();
    $('.socket_' + response.socket_id + ' button').replaceWith(newNode);
    window.location.href='game.html?username='+username + '&game_id' + response.game_id;
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

    /*If we are being notified of ourselves then ignore message */
    if(response.socket_id === socket.id) {
        return;
    }

    let domElements = $('.socket_' + response.socket_id); 

    
    // if we are being repeat notifed then return
    
    if(domElements.length !== 0) {
        return;
    }

    /*
    
        <div class = "row align items center">
            <div class = "col text-end">  
                Michael
            </div>
            <div class = "col text-end">
                <button type="button" class "btn btn-primary">Invite </button>
            </div>
        </div>
    */

    /* Creating Dynamic Invite from lobby section */

        let nodeA = $("<div></div>");
        nodeA.addClass("row");
        nodeA.addClass("align-items-left");
        nodeA.addClass("socket_" + response.socket_id);
        nodeA.hide();
        let nodeB = $("<div></div>");
        nodeB.addClass("col");
        //nodeB.addClass("text-end");
        nodeB.addClass("socket_" + response.socket_id);
        nodeB.append('<h4>'+ response.username + '</h4>')
        let nodeC = $("<div></div>");
        nodeC.addClass("col");
        nodeC.addClass("text-start");
        nodeC.addClass("socket_" + response.socket_id);
        let buttonC = makeInviteButton(response.socket_id);
        nodeC.append(buttonC);
        nodeA.append(nodeB);
        nodeA.append(nodeC);

        $("#players").append(nodeA);
        nodeA.show("fade", 1000);
    
    /* Announcing in the chat that someone has arrived */
    let newString = '<p class = \'join_room_response\'> ' + response.username + ' joined the ' + response.room + '. (' +response.count + ' user(s) in the room.)</p>';
    let newNode = $(newString);
    newNode.hide();
    $('#messages').prepend(newNode);
    newNode.show("fade",300);



});

socket.on('player_disconnected', (response) => {
    if((typeof response == 'undefined') || (response === null)) {
        console.log('Server did not receive response')
        return;
    }
    
    if(response.socket_id === socket.id) {
        return;
    }
    let domElements = $('.socket_'+response.socket_id);
    if(domElements.length !== 0) {
        domElements.hide("fade",500);
    }

    let newString = '<p class = \'left_room_response\'> ' + response.username + ' left the ' + response.room + '. (' +response.count + ' user(s) in the room.)</p>';
    let newNode = $(newString);
    newNode.hide();
    $('#messages').prepend(newNode);
    newNode.show("fade",300);



});



function sendMessage() {
    let request = {};
    request.room = chatRoom;
    request.username = username;
    request.message = $('#chatMessage').val(); 

    console.log('**** Client log message, sending \'send_message\' command: ' +JSON.stringify(request));

    socket.emit('send_message', request);

    $('#chatMessage').val(''); 

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
    let newNode = $(newString);
    newNode.hide();
    $('#messages').prepend(newNode);
    newNode.show("fade",300);


});

// Request to join chat room

$( () =>{
    let request = {};
    request.room = chatRoom;
    request.username = username;
    console.log('**** Client log message, sending \'join_room\' command: ' +JSON.stringify(request));
    socket.emit('join_room', request);

    $('#welcome').prepend('<h3>Welcome to the Lobby, ' + username+'</h3>');


    $('#chatMessage').keypress(
        function(e) {
            let key = e.which;
            if(key == 13) {// enter key
                $('button[id = chatButton]').click();
                return false;
            }

        })


});