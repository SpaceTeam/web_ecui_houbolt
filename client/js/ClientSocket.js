
var socket = io();
var start = new Date();

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

var jsonSequence;
var jsonSensors = {};
var wasRunning = false;

var seqChart = new SequenceChart("sequenceChart", "Sequence");

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
    seqChart.update(timeMillis);
}

function abortSequence()
{
    seqChart.stop();

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
    console.log('checklist-load:');
    console.log(jsonChecklist);

    for (itemInd in jsonChecklist)
    {
        let currItem = jsonChecklist[itemInd];
        let currId = currItem.id;
        console.log(itemInd);
        let newCard = $('#templates').children().first().clone();
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

    //TODO: check with user credentials and only display them when master
    //$('#checklistCol').hide('slide', { direction: 'right' }, 300);
    $('#startChecklistButton').attr('hidden', '');
    $('#toggleSequenceButton').removeAttr('hidden');
});

socket.on('sequence-load', function(jsonSeq) {

    jsonSequence = jsonSeq;

    $('#messages').append($('<li>').text('SEQUENCE-LOAD arrived: \n'));
    $('#timer').text(jsonSeq.globals.startTime);
    if (Number.isInteger(jsonSeq.globals.startTime))
    {
        $('#timer').append('.0')
    }
    $('#timer').css("color", "green");
    console.log('sequence-load:');
    console.log(jsonSeq);

    console.log(seqChart.chart.data);
    seqChart.loadSequenceChart(jsonSeq);
    console.log(seqChart.chart.data);

});

socket.on('sequence-start', function() {
    console.log('sequence-start:');
    $('#timer').css("color", "green");

    if (wasRunning) {
        seqChart.reset();
        seqChart.loadSequenceChart(jsonSequence);
        console.log(seqChart.chart.data);
    }
    else
    {
        wasRunning = true;
    }
    seqChart.start();

    intervalMillis = jsonSequence.globals.interval * 1000;
    timeMillis = jsonSequence.globals.startTime * 1000;
    endTime = jsonSequence.globals.endTime;
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

    seqChart.stop();

    $('#timer').text(endTime);
    clearInterval(intervalDelegate);
    if (Number.isInteger(endTime))
    {
        $('#timer').append('.0');
    }
    $('#toggleSequenceButton').text("Start Sequence");
});

socket.on('sensor', function(jsonSen) {
    console.log('sensor');


    let sensor;
    if (jsonSen.id in jsonSensors)
    {
        sensor = jsonSensors[jsonSen.id];
    }
    else
    {
        sensor = {};
        let newChartDiv = $('#tempChart').clone();
        newChartDiv.attr("id", jsonSen.name + jsonSen.id);
        newChartDiv.removeAttr("hidden");
        $('#sensorChartDiv').append(newChartDiv);

        if ("chartTitle" in jsonSen)
        {
            sensor.chartTitle = jsonSen.chartTitle;
        }
        else
        {
            sensor.chartTitle = jsonSen.name;
        }

        sensor.div = newChartDiv;
        sensor.chart = new SensorChart(jsonSen.name + jsonSen.id, sensor.chartTitle);
        sensor.series = sensor.chart.addSeries(jsonSen.name, jsonSen.name);
        sensor.name = jsonSen.name;

        jsonSensors[jsonSen.id] = sensor;

    }
    sensor.chart.addSingleData(sensor.series, jsonSen.time, jsonSen.value);
});

socket.on('chat message', function(msg){
    $('#messages').append($('<li>').text(msg));
    $('#messages').append(new Date().getTime() - start.getTime() + "ms elapsed\n");
    //window.scrollTo(0, document.body.scrollHeight);
});