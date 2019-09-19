
var socket = io();
var start = new Date();

$('form').submit(function(){
    start = new Date();
    socket.emit('chat message', $('#m').val());
    $('#m').val('');
    return false;
});

$('#startChecklistButton').click(function(){socket.emit('checklist-start')});
$('#toggleSequenceButton').click(function()
{
    if ($(this).text() === 'Start Sequence')
    {
        socket.emit('sequence-start');
        $(this).text('Abort Sequence');
    }
    else if ($(this).text() === 'Abort Sequence')
    {
        abortSequence();
        $(this).text('Start Sequence');
    }

});

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

function abortSequence()
{
    clearInterval(intervalDelegate);
    $('#timer').css("color", "red");
    socket.emit('abort');
}

function onChecklistTick(checkbox)
{
    let currId = checkbox.id.substr(14);
    checkbox.setAttribute('disabled', '');

    //TODO: with user authentification: check if user is master and only then send message (performance)
    socket.emit('checklist-tick', currId);
}

socket.on('abort', function() {
    console.log('abort');

    abortSequence();

});

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
            .attr('aria-controls', 'checklistItemCollapse' + currId)
            .attr('for', 'checklistCheck' + currId);
        newCard.find('#checklistCheckTemp').attr('id', 'checklistCheck' + currId);
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

socket.on('checklist-update', function(id) {
    console.log('checklist-update');
    //onChecklistTick(id, true);
    console.log(id);
    $('#checklistCheck' + id).click();
});

socket.on('checklist-done', function() {
    console.log('checklist-done');
    $('#checklistCol').hide('slide', { direction: 'right' }, 300);
    $('#startChecklistButton').attr('hidden', '');
    $('#toggleSequenceButton').removeAttr('hidden');
});

socket.on('sequence-load', function(jsonSeq) {
    $('#messages').append($('<li>').text('SEQUENCE-LOAD arrived: \n'));
    $('#timer').text(jsonSeq.globals.startTime);
    $('#timer').css("color", "green");
    console.log('sequence-load:');
    console.log(jsonSeq);

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