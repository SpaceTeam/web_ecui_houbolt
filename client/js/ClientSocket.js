
var socket = io();
var start = new Date();

socket.on('connect', function() {socket.emit('checklist-start')});
$('#toggleSequenceButton').click(function()
{
    if ($(this).text() === 'Start Sequence')
    {
        socket.emit('sequence-start');
        $(this).text('Abort Sequence');
        $('.tab-button').each(function () {
            if ($(this).id !== "monitor-tab-button")
            {
                $(this).prop('disabled', true);
            }
        });
    }
    else if ($(this).text() === 'Abort Sequence')
    {
        abortSequence();
        $(this).text('Start Sequence');
        $('.tab-button').each(function () {
            if ($(this).id !== "monitor-tab-button")
            {
                $(this).prop('disabled', false);
            }
        });
    }

});
$('#saftlButton').click(function() {
    $('.servo-slider').each(function () {
        let slider = $(this);
        let lastVal = slider.val();
        slider.val(slider.attr('max')).trigger('input');
        setTimeout(function () {
            slider.val(lastVal).trigger('input');
        }, 2000);
    })
});


function onServoSpinnerChange(spinner) {

    let spinnerId = spinner.attr('id');
    let sliderId = spinnerId.substr(0, spinnerId.length-3);
    let id = parseInt($('#' + sliderId).attr('idNum'));
    let val = parseFloat(spinner.val());
    sendServo(id, val);
}

function onServoSliderInput(servoSlider)
{
    let id = parseInt(servoSlider.attr('idNum'));
    let val = parseFloat(servoSlider.val());
    if (isNaN(id))
    {
        id = -1;
    }

    sendServo(id, val);
}

function sendServo(servoId, servoValue)
{
    let jsonServo = {};

    jsonServo.id = servoId;
    jsonServo.value = servoValue;
    socket.emit('servos-set', [jsonServo]);
}

function sendServoMin(servoId, newServoMin)
{
    let jsonServo = {};

    jsonServo.id = servoId;
    jsonServo.min = newServoMin;
    socket.emit('servos-calibrate', [jsonServo]);
}

function sendServoMax(servoId, newServoMax)
{
    let jsonServo = {};

    jsonServo.id = servoId;
    jsonServo.max = newServoMax;
    socket.emit('servos-calibrate', [jsonServo]);
}

function onCalibrateMin(button) {

    let buttonId = button.attr('id');
    let sliderId = buttonId.substr(0, buttonId.length-3);

    let id = parseInt($('#' + sliderId).attr('idNum'));
    let min = parseFloat($('#' + sliderId + 'Cal').val());

    sendServoMin(id, min);
}

function onCalibrateMax(button) {

    let buttonId = button.attr('id');
    let sliderId = buttonId.substr(0, buttonId.length-3);
    let id = parseInt($('#' + sliderId).attr('idNum'));
    let max = parseFloat($('#' + sliderId + 'Cal').val());
    sendServoMax(id, max);
}

function onServoEnable(checkbox) {
    console.log(checkbox.checked);
    if (checkbox.checked)
    {
        $('#servoEnableCheck').prop('checked', true);
        $('#servoEnableCheck1').prop('checked', true);

        $('#toggleSequenceButton').prop('disabled', true);

        $('.range-slider__value').each(function () {
            $(this).attr('disabled', false);
        });

        $('.manual-obj').each(function () {
            $(this).prop('disabled', false);
        });
    }
    else
    {
        $('#servoEnableCheck').prop('checked', false);
        $('#servoEnableCheck1').prop('checked', false);

        $('#toggleSequenceButton').prop('disabled', false);

        $('.range-slider__range').each(function () {
            //$(this).val(0).trigger('input');
        });
        $('.range-slider__value').each(function () {
            $(this).attr('disabled', true);
        });

        $('.manual-obj').each(function () {
            $(this).prop('disabled', true);
        });
    }
}

var jsonSequence;
var jsonSensors = {};
var checklistLoaded = false;

var seqChart = new SequenceChart("sequenceChart", "Sequence");

var endTime;
var timeMillis;
var intervalMillis;
var intervalDelegate;
function timerTick()
{
    console.log(timeMillis);
    $('#timer').text(timeMillis/1000);

    if (Number.isInteger(timeMillis/1000))
    {
        if (timeMillis/1000 < 0)
        {
            responsiveVoice.speak(Math.abs(timeMillis/1000).toString(), "US English Female", {rate: 1.2});
        }
        else if (timeMillis/1000 === 0)
        {
            //responsiveVoice.speak("Hans, get se Flammenwerfer!", "Deutsch Male", {rate: 1.2});
            responsiveVoice.speak("ignition", "US English Female", {rate: 1.2});
        }
        $('#timer').append('.0');
    }
    seqChart.update(timeMillis);

    timeMillis += intervalMillis;
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

socket.on('servos-load', function(jsonServos) {
    console.log('servos-load');
    console.log(jsonServos);

});

socket.on('checklist-load', function(jsonChecklist) {
    $('#messages').append($('<li>').text('CHECKLIST-LOAD arrived: \n'));
    console.log('checklist-load:');
    console.log(jsonChecklist);

    if (!checklistLoaded) {
        checklistLoaded = true;
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

    $('#toggleSequenceButton').text("Abort Sequence");
    $('#timer').css("color", "green");


    seqChart.start();


});

socket.on('timer-start', function () {

    intervalMillis = 100; //hard code timer step to 100 for client
    timeMillis = jsonSequence.globals.startTime * 1000;
    endTime = jsonSequence.globals.endTime;
    responsiveVoice.enableEstimationTimeout = false;

    if (timeMillis/1000 === 0)
    {
        responsiveVoice.speak("ignition", "US English Female", {rate: 1.2});
    }
    else {
        responsiveVoice.speak(Math.abs(timeMillis / 1000).toString(), "US English Female", {rate: 1.2});
    }

    intervalDelegate = setInterval(timerTick, intervalMillis);
});

socket.on('sequence-sync', function(time) {
    console.log('sequence-sync:');
    timeMillis = time * 1000;
    console.log(timeMillis);
    // clearInterval(intervalDelegate);
    // if (timeMillis < endTime*1000) {
    //      intervalDelegate = setInterval(timerTick, intervalMillis);
    // }
    // timerTick();
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

    //disable all other tabs
    $('.tab-button').each(function () {
        if ($(this).id !== "monitor-tab-button")
        {
            $(this).prop('disabled', false);
        }
    });

    seqChart.reset();
    seqChart.loadSequenceChart(jsonSequence);
    console.log(seqChart.chart.data);

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