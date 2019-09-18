
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
    $('#timer').text(timeMillis/1000);
    if (Number.isInteger(timeMillis/1000))
    {
        $('#timer').append('.0')
    }
}

socket.on('checklist-load', function(jsonChecklist) {
    $('#messages').append($('<li>').text('CHECKLIST-LOAD arrived: \n'));
    console.log('checklist-load:')
    console.log(jsonChecklist)

    window.scrollTo(0, document.body.scrollHeight);


    for (itemInd in jsonChecklist)
    {
        let currItem = jsonChecklist[itemInd];
        let currId = currItem.id;
        console.log(itemInd);
        let newCard = $('#cardTemplate').children().first().clone();
        newCard.find('#headingTemp').attr('id', 'checklistItemHeading' + currId)
            .find('button').attr('data-target', '#checklistItemCollapse' + currId)
            .attr('aria-controls', 'checklistItemCollapse' + currId);
        newCard.find('#collapseTemp').attr('id', 'checklistItemCollapse' + currId)
            .attr('aria-labelledby', 'checklistItemHeading' + currId);

        newCard.find('button').text(currItem.name);

        let notes = $('<ul>');
        for (noteInd in currItem.notes)
        {
            notes.append($('<li>').text(currItem.notes[noteInd]));
        }
        newCard.find('.card-body').append(notes);

        $('#checklist').append(newCard);
    }
});

socket.on('sequence-load', function(jsonSeq) {
    $('#messages').append($('<li>').text('SEQUENCE-LOAD arrived: \n'));
    $('#timer').text(jsonSeq.globals.startTime);
    $('#timer').css("color", "green");
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
    $('#timer').text(endTime);
    clearInterval(intervalDelegate);
    $('#timer').css("color", "red");
    if (Number.isInteger(endTime))
    {
        $('#timer').append('.0');
    }
});

socket.on('chat message', function(msg){
    $('#messages').append($('<li>').text(msg));
    $('#messages').append(new Date().getTime() - start.getTime() + "ms elapsed\n");
    window.scrollTo(0, document.body.scrollHeight);
});