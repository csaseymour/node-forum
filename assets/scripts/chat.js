$(document).ready(function(){
    var users = document.getElementById('online-users');
    var ul = document.getElementById('chat-messages');
    var socket = io();
    socket.on('message-in', (data) =>{
        var message = document.createElement('p');
        var username = "<span>" + data.username + ":</span>";
        message.innerHTML = username + data.message;
        ul.append(message);
        $('#chat-messages').animate({
            scrollTop: $('#chat-messages').get(0).scrollHeight
        }, 10);
    });

    socket.on('onlineusers', (data) =>{
        var usersString = ""
        data.users.forEach(user =>{
            usersString += '"' + user + '" ';
        });
        users.innerHTML = usersString;
        console.log(data);
    });

    socket.on('messagebuffer', (data) =>{
        data.messages.forEach(element => {
            var message = document.createElement('p');
            var username = "<span>" + element.username + ":</span>";
            message.innerHTML = username + element.message;
            ul.append(message);
        });
        $('#chat-messages').animate({
            scrollTop: $('#chat-messages').get(0).scrollHeight
        }, 500);
    });

    $("#message-box").on("keypress", function(e){
        if(e.which == 13){
            if($('#message-box').val().length == 0){
                $('#message-box').val("");
            }else{
                socket.emit('chat message', $('#message-box').val());
                $('#message-box').val("");
            }
            
        }
    });
});
