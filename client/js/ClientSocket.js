$(function () {
    var socket = io();
    var start = new Date();
    $('form').submit(function(){
        start = new Date();
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });
    $('#tickButton').click(function(){socket.emit('checklist-tick', $('#m').val())});
    $('#startChecklistButton').click(function(){socket.emit('checklist-start')});
    $('#startSequenceButton').click(function(){socket.emit('sequence-start')});
    socket.on('checklist-load', function(msg) {
        $('#messages').append($('<li>').text('CHECKLIST-LOAD arrived: \n'));
        console.log('checklist-load:')
        console.log(msg)

        window.scrollTo(0, document.body.scrollHeight);
    });

    socket.on('chat message', function(msg){
        $('#messages').append($('<li>').text(msg));
        $('#messages').append(new Date().getTime() - start.getTime() + "ms elapsed\n");
        window.scrollTo(0, document.body.scrollHeight);
    });
});