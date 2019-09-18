$(function () {
        var socket = io();
        var start = new Date();
        $('form').submit(function(){
          start = new Date();
          socket.emit('chat message', $('#m').val());
          $('#m').val('');
          return false;
        });
        socket.on('chat message', function(msg){
          $('#messages').append($('<li>').text(msg));
          $('#messages').append(new Date().getTime() - start.getTime() + "\n");
          window.scrollTo(0, document.body.scrollHeight);
        });
      });