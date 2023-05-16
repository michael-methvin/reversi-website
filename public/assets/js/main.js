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

let username = getIRIParameterVal('username');

if ((typeof username == 'undefined') || (username === null) || (username == '')) {
    username = "Anonymous_" + Math.floor(Math.random()*1000);
}
$('#welcome').prepend('<h3>Welcome to the Lobby, ' + username);
$('#messages').prepend('<b>' + username + ':</b>');



let socket = io();
socket.on('log', function(array) {
    console.log.apply(console,array);
});