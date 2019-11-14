
var socket = io();
var start = new Date();

socket.on('connect', function() {socket.emit('checklist-start')});

socket.on('connect_timeout', function() {console.log('connect-timeout')});
socket.on('connect_error', function(error) {console.log(error)});

document.onkeydown = function () {
    var seqButton = $('#toggleSequenceButton');
    console.log(seqButton.text());
    if (seqButton.text() === 'Abort Sequence')
    {
        seqButton.click();
    }
};

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
        abortSequence("abort from user");
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
    $('#fuel').each(function () {
        let slider = $(this);
        let lastVal = slider.val();
        slider.val(slider.attr('max')).trigger('input');
        setTimeout(function () {
            slider.val(lastVal).trigger('input');
        }, 2000);
    })
});

$('#resetButton').click(function() {
    emptySensorCharts();
});

function onServoSpinnerChange(spinner) {

    let spinnerId = spinner.attr('id');
    let sliderId = spinnerId.substr(0, spinnerId.length-3);
    let id = $('#' + sliderId).attr('id');
    let val = parseFloat(spinner.val());
    sendServoRaw(id, val);
}

function onServoSliderInput(servoSlider)
{
    let id = servoSlider.attr('id');
    let val = parseFloat(servoSlider.val());
    sendServo(id, val);
}

function sendDigitalOut(doId, doValue)
{
    let jsonDigitalOut = {};

    jsonDigitalOut.id = doId;
    jsonDigitalOut.value = doValue;
    socket.emit('digital-outs-set', [jsonDigitalOut]);
}

function sendServo(servoId, servoValue)
{
    let jsonServo = {};

    jsonServo.id = servoId;
    jsonServo.value = servoValue;
    socket.emit('servos-set', [jsonServo]);
}

function sendServoRaw(servoId, rawValue)
{
    let jsonServo = {};

    jsonServo.id = servoId;
    jsonServo.value = rawValue;
    socket.emit('servos-set-raw', [jsonServo]);
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

    let id = $('#' + sliderId).attr('id');
    let min = parseFloat($('#' + sliderId + 'Cal').val());

    sendServoMin(id, min);
}

function onCalibrateMax(button) {

    let buttonId = button.attr('id');
    let sliderId = buttonId.substr(0, buttonId.length-3);
    let id = $('#' + sliderId).attr('id');
    let max = parseFloat($('#' + sliderId + 'Cal').val());
    sendServoMax(id, max);
}

function onServosLoad(jsonServosData)
{
    for (let dataInd in jsonServosData)
    {
        let dataItem = jsonServosData[dataInd];

        $('#' + dataItem.name + 'MinLabel').text(dataItem.endpoints[0]);
        $('#' + dataItem.name + 'MaxLabel').text(dataItem.endpoints[1]);
    }
}

function onIgniterCheck(checkbox)
{
    let id = $(checkbox).attr('id');

    if (checkbox.checked)
    {
        sendDigitalOut(id, true);
    }
    else
    {
        sendDigitalOut(id, false);
    }

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

        socket.emit('servos-enable');
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

        socket.emit('servos-disable');
    }
}

var llServerConnectionActive = false;

function checkConnection()
{
    if (llServerConnectionActive)
    {
        $('#statusBar').css("background-color","transparent");
        $('#statusBar').text(null);
    }
    else
    {
        $('#statusBar').css("background-color","#FFCD00");
        $('#statusBar').text("No Connection to LLServer");
    }
}

setInterval(function(){checkConnection();llServerConnectionActive = false;}, 4000);

var jsonSequence;
var jsonSensors = {};
var checklistLoaded = false;
var isContinousTransmission = true;

var seqChart = new SequenceChart("sequenceChart", "Sequence");

var endTime;
var timeMillis;
var intervalMillis;
var intervalDelegate;

var countdownTime;
var countdownIntervalDelegate;

function timerTick()
{
    console.log(timeMillis);
    let time = timeMillis/1000;
    $('#timer').text(time);

    if (Number.isInteger(time))
    {
        // if (time < 0 && time >= -5)
        // {
        //     responsiveVoice.speak(Math.abs(time).toString(), "US English Female", {rate: 1.2});
        // }
        // else if (time === 0)
        // {
        //     ////responsiveVoice.speak("Hans, get se Flammenwerfer!", "Deutsch Male", {rate: 1.2});
        //     responsiveVoice.speak("ignition", "US English Female", {rate: 1.2});
        // }
        $('#timer').append('.0');
    }

    seqChart.update(timeMillis);

    timeMillis += intervalMillis;
}

function sequenceButtonStop()
{
    $('#toggleSequenceButton').text("Start Sequence");

    //disable all other tabs
    $('.tab-button').each(function () {
        if ($(this).id !== "monitor-tab-button")
        {
            $(this).prop('disabled', false);
        }
    });
}

function abortSequence(abortMsg)
{
    clearInterval(countdownIntervalDelegate);

    seqChart.stop();

    clearInterval(intervalDelegate);

    $('#timer').css("color", "red");
    socket.emit('abort');

    sequenceButtonStop();

    setTimeout(function () {
            responsiveVoice.speak(abortMsg, "US English Female", {rate: 1.0});
        }, 1000);
    setTimeout(function () {
            emptySensorCharts();
            isContinousTransmission = true;
        }, 3000);

    seqChart.reset();
    seqChart.loadSequenceChart(jsonSequence);
    console.log(seqChart.chart.data);
}

function onChecklistTick(checkbox)
{
    let currId = checkbox.id.substr(14);
    checkbox.setAttribute('disabled', '');

    //TODO: with user authentification: check if user is master and only then send message (performance)
    socket.emit('checklist-tick', currId);
}

function emptySensorCharts()
{
    for (let sensorName in jsonSensors)
    {
        jsonSensors[sensorName].chart.removeContent();
    }
}

function countdownTimerTick()
{
    if (countdownTime < 0 && countdownTime >= -10)
    {
        responsiveVoice.speak(Math.abs(countdownTime).toString(), "US English Female", {rate: 1.2});
    }
    else if (countdownTime === 0)
    {
        responsiveVoice.speak("ignition", "US English Female", {rate: 1.2});
        clearInterval(countdownIntervalDelegate);
    }
    countdownTime += 1;
}

socket.on('abort', function(abortMsg) {
    console.log('abort');

    abortSequence(abortMsg);
});

socket.on('servos-load', function(jsonServosData) {
    console.log('servos-load');
    console.log(jsonServosData);
    onServosLoad(jsonServosData);

});

socket.on('checklist-load', function(jsonChecklist) {
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

    //empty sensor chart div first
    emptySensorCharts();
    isContinousTransmission = false;

    //responsiveVoice.speak("starting sequence", "US English Female", {rate: 1});

    $('#toggleSequenceButton').text("Abort Sequence");
    $('#timer').css("color", "green");

    seqChart.start();
});

socket.on('timer-start', function () {

    intervalMillis = 100; //hard code timer step to 100 for client
    timeMillis = jsonSequence.globals.startTime * 1000;
    endTime = jsonSequence.globals.endTime;
    responsiveVoice.enableEstimationTimeout = false;

    countdownTime = jsonSequence.globals.startTime;
    countdownTimerTick();
    countdownIntervalDelegate = setInterval(countdownTimerTick, 1000);

    timerTick();
    intervalDelegate = setInterval(timerTick, intervalMillis);
});

socket.on('sequence-sync', function(time) {
    console.log('sequence-sync:');
    timeMillis = time * 1000;
    console.log(timeMillis);

    // if (time < 0 && time >= -5)
    // {
    //     responsiveVoice.speak(Math.abs(time).toString(), "US English Female", {rate: 1.4});
    // }
    // else if (time === 0)
    // {
    //     responsiveVoice.speak("ignition", "US English Female", {rate: 1.4});
    // }
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
    sequenceButtonStop();

    seqChart.reset();
    seqChart.loadSequenceChart(jsonSequence);
    console.log(seqChart.chart.data);

    setTimeout(function () {
            emptySensorCharts();
            isContinousTransmission = true;
        }, 3000);

});

socket.on('sensors', function(jsonSens) {
    console.log('sensors');

    if (!llServerConnectionActive)
    {
        llServerConnectionActive = true;
        checkConnection();
    }

    for (let sensorInd in jsonSens)
    {
        let jsonSen = jsonSens[sensorInd];
        let sensor;
        if (jsonSen.name in jsonSensors)
        {
            sensor = jsonSensors[jsonSen.name];
        }
        else
        {
            sensor = {};
            let newChartDiv = $('#tempChart').clone();
            newChartDiv.attr("id", jsonSen.name + "Chart");
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
            sensor.chart = new SensorChart(jsonSen.name + "Chart", sensor.chartTitle);
            sensor.series = sensor.chart.addSeries(jsonSen.name, jsonSen.name);
            sensor.name = jsonSen.name;

            jsonSensors[jsonSen.name] = sensor;

        }
        sensor.chart.addSingleData(sensor.series, jsonSen.time, jsonSen.value, isContinousTransmission);
    }

});