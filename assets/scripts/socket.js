class notification{
    constructor(type, message){
        this.type = type;
        this.message = message;
    }
}

$(document).ready(function(){
    var chatbox = document.getElementById('chatbox');
    var messages = document.getElementById('chat-messages');
    var users = document.getElementById('users');
    var icon = document.getElementById('not-icon');
    var notifications = document.getElementById('notifications');
    var toast = document.getElementById('toast');
    var socket = io();

    if(chatbox){
        console.log('true');
    }else{
        console.log('false');
    }
    socket.on('message-in', (data) =>{
        if(chatbox){
          data.message = data.message.replace(/(<([^>]+)>)/gi, "");
            var message = document.createElement('p');
            var username = "<span style='color:" + data.color + "'>" + data.username + ":</span>"
            message.innerHTML = username + " " + data.message;
            messages.append(message);
            $('#chat-messages').animate({
                scrollTop: $('#chat-messages').get(0).scrollHeight
            }, 10);  
        }
    });

    socket.on('notification-add', (data) =>{
        var notification = document.createElement('div');
        var note = document.createElement('p');
        var noteClose = document.createElement('i');
        noteClose.innerHTML = "close";
        noteClose.classList.add('not-remove');
        noteClose.classList.add('material-icons');
        noteClose.style.color = "red";
        noteClose.style.cursor = "pointer";
        note.innerHTML = data.nType + "</br>" + data.message;

        notification.classList.add('notification');
        notification.append(note);
        notification.append(noteClose);

        $('#notifications').append(notification);
    });

    socket.on('users', (data) =>{
        if(chatbox){
            var usrs = document.getElementsByClassName('usr');
            while(usrs[0]){
                usrs[0].parentNode.removeChild(usrs[0]);
            }
            data.users.forEach(user =>{
                var usr = document.createElement('p');
                usr.classList.add('usr');
                usr.innerHTML = user;
                users.append(usr);
            });
        }
    });

    socket.on('messagebuffer', (data) =>{
        if(chatbox){
            data.messages.forEach(element => {
                element.message = element.message.replace(/(<([^>]+)>)/gi, "");
                var message = document.createElement('p');
                var username = "<span style='color:" + element.color + "'>" + element.username + ": </span>";
                message.innerHTML = username + element.message;
                messages.append(message);
            });
            $('#chat-messages').animate({
                scrollTop: $('#chat-messages').get(0).scrollHeight
            }, 500);
        }
    });

    socket.on('toast', (data) =>{
        $("#not-icon").text("notifications_active");
        var toastMessage = document.getElementById('toast-message');
        toastMessage.innerHTML = data.nType;
        toast.classList.remove('toast');
        toast.classList.add('toastshow');
        setTimeout(function(){toast.classList.remove('toastshow');toast.classList.add('toast');}, 3000);
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

    $('#not-icon').click( function(){
        if(notifications.classList.contains('notifications-hidden')){
            socket.emit('notification', "anything really");
            icon.innerHTML = "notifications";
            notifications.classList.remove('notifications-hidden');
            notifications.classList.add('notifications-visible');
        }else{
            notifications.classList.remove('notifications-visible');
            notifications.classList.add('notifications-hidden');
            icon.innerHTML = "notifications_none";
        }
    });

    $('i.not-remove').click( function(){
        console.log('test');
        socket.emit('not-remove', $(this).attr('id'));
        var parent = $(this).parent();
        parent.remove();
    });
});
