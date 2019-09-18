
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

var endTime;
var timeMillis;
var intervalMillis;
var intervalDelegate;
function timerTick()
{
    timeMillis += intervalMillis;
    $("#timer").text(timeMillis/1000);
}

socket.on('checklist-load', function(jsonChecklist) {
    $('#messages').append($('<li>').text('CHECKLIST-LOAD arrived: \n'));
    console.log('checklist-load:')
    console.log(jsonChecklist)

    window.scrollTo(0, document.body.scrollHeight);
});

socket.on('sequence-load', function(jsonSeq) {
    $('#messages').append($('<li>').text('SEQUENCE-LOAD arrived: \n'));
    $('#timer').text(jsonSeq.globals.startTime);
    $("#timer").css("color", "green");
    console.log('sequence-load:')
    console.log(jsonSeq)

    intervalMillis = jsonSeq.globals.interval * 1000;
    timeMillis = jsonSeq.globals.startTime * 1000;
    endTime = jsonSeq.globals.endTime;
    console.log(endTime);
    intervalDelegate = setInterval(timerTick, intervalMillis);
});

socket.on('sequence-sync', function(time) {
    console.log('sequence-sync:');
    timeMillis = time * 1000;
    console.log(timeMillis);
    // clearInterval(intervalDelegate);
    // if (timeMillis < endTime*1000) {
    //     intervalDelegate = setInterval(timerTick, intervalMillis);
    // }
});

socket.on('sequence-done', function() {
    console.log('sequence-done:');
    $("#timer").text(endTime);
    clearInterval(intervalDelegate);
    $("#timer").css("color", "red");
});

socket.on('chat message', function(msg){
    $('#messages').append($('<li>').text(msg));
    $('#messages').append(new Date().getTime() - start.getTime() + "ms elapsed\n");
    window.scrollTo(0, document.body.scrollHeight);
});