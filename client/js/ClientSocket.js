
//-------------------------------------Global Variables | Yikes!!!---------------------------------
var socket = io();

var sequences = [];
var abortSequences = [];
var jsonSequence = {};
var jsonAbortSequence = {};
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

var llServerConnectionActive = false;

var master = false;

var disableSensorChartsOnLoad = true;

//create observer to check if sensor charts shall be rendered
var chartTabObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === "attributes")
        {
            if(mutation.target.classList.contains("show"))
            {
                console.log("sensor charts d");
                window.scrollTo(0,document.body.scrollHeight);
                for (let sensorName in jsonSensors)
                {
                    jsonSensors[sensorName].chart.enable();
                }
            }
            else
            {
                console.log("sensor charts disabled");
                for (let sensorName in jsonSensors)
                {
                    jsonSensors[sensorName].chart.disable();
                }
            }
        }
    });
});

chartTabObserver.observe(document.getElementById('chart-tab'), {
  attributes: true //configure it to listen to attribute changes
});

var lastModalTriggeredElement = undefined;

//-------------------------------------GUI Events---------------------------------

$('#outputAssuranceModal').on('show.bs.modal', function (event) {
    lastModalTriggeredElement = event.relatedTarget;
    var modal = $(this)
    modal.find('#modal-output-name').text(event.relatedTarget.id);
});

var mouseDown = false;
$('.servo-slider').mousedown(function() {
    mouseDown = true;
	console.log('mouse down')
}).mouseup(function() {
    mouseDown = false;
	console.log('mouse up')
});

function onCheckboxModal(checkbox)
{
    if (checkbox.checked)
    {
        $(checkbox).prop('checked', false);
        $('#outputAssuranceModal').modal('show', checkbox);
    }
    else
    {
        onDigitalCheck(checkbox);
    }
}

function onModalAccept() {
    console.log(lastModalTriggeredElement);
    if (lastModalTriggeredElement !== undefined)
    {
        if ($(lastModalTriggeredElement).hasClass("digitalOut"))
        {
            $(lastModalTriggeredElement).prop('checked', true);
            onDigitalCheck(lastModalTriggeredElement);
        }
    }
}

function onModalReject()
{

}

function onResetSensors() {
    emptySensorCharts();
}

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
    var msg = {id: id, property: 'value', value: val};
    setParameter(msg);
    sendServo(id, val);
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
        $('#' + dataItem.name).val(dataItem.percent);
        $('#' + dataItem.name).trigger('input');
    }
}

function onSuperchargeSet()
{
    let setpoint = parseFloat($('#' + 'setpoint').val());
    let hysteresis = parseFloat($('#' + 'hysteresis').val())*10; //multiply by 10 to convert from 1 decimal place to int
    sendSupercharge(setpoint, hysteresis);
}

function onSuperchargeLoad(jsonSuperchargeData)
{
	$('#' + 'setpoint').val(jsonSuperchargeData.setpoint);
	$('#' + 'hysteresis').val(jsonSuperchargeData.hysteresis/10);
}

//BE CAREFUL when using the delay feature: when enabling first digital gets set instantly and others
//after the delay, when disabling however, the others get set first then the first one (mainly used for solenoid timing
//when this was written)
function onDigitalCheck(checkbox, delaySecondDigitalOut=0.0)
{
    let id = $(checkbox).attr('id');

    let ids = id.split(";");
    console.log(ids);

    //If coolingNotHeating is enabled -> only coolingPump can be enabled
    //If it is not enabled            -> only heatingPunp can be enabled
    if (id === "coolingNotHeatingValve"){
        $('#heatingPump').prop('disabled', checkbox.checked);
        $('#coolingPump').prop('disabled', !(checkbox.checked));
    }
    if (id === "heatingPump"){
        $('#coolingNotHeatingValve').prop('disabled', checkbox.checked);
    }
    if (id === "coolingPump"){
        $('#coolingNotHeatingValve').prop('disabled', checkbox.checked);
    }

    if (delaySecondDigitalOut > 0.0 && ($('.manualEnableCheck:checked').length > 0)) {
        $(checkbox).prop('disabled', true);
        $('.manualEnableCheck').each(function(){$(this).prop('disabled', true);});
        setTimeout(function () {
            $(checkbox).prop('disabled', false);
            $('.manualEnableCheck').each(function(){$(this).prop('disabled', false);});
        }, delaySecondDigitalOut * 1000);
    }

    if (checkbox.checked) {
        if (delaySecondDigitalOut === 0.0)
        {
            sendDigitalOutArr(ids, true);
        }
        else
        {
            sendDigitalOut(ids[0], true);
            setTimeout(function () {
                sendDigitalOutArr(ids.slice(1), true);
            }, delaySecondDigitalOut*1000);
        }
    }
    else
    {
        if (delaySecondDigitalOut === 0.0)
        {
            sendDigitalOutArr(ids, false);
        }
        else
        {
            sendDigitalOutArr(ids.slice(1), false);

            setTimeout(function () {
                sendDigitalOut(ids[0], false);
            }, delaySecondDigitalOut*1000);
        }
    }
}

// Set colored progress bar in servo slider for visual feedback
function refreshServoFeedback(jsonSen){

	if(jsonSen.name.includes("Valve")) {
		var sliderId = null;

		if(jsonSen.name.includes("fuelMainValveFb")){ sliderId = "#fuelMainValve";}
		else if(jsonSen.name.includes("oxSuperchargeValveFb")){ sliderId = "#oxSuperchargeValve";}
		else if(jsonSen.name.includes("oxMainValveFb")){ sliderId = "#oxMainValve";}
		else if(jsonSen.name.includes("oxfillMainValveFb")){ sliderId = "#oxfillMainValve";}
		else if(jsonSen.name.includes("oxfillVentValveFb")){ sliderId = "#oxfillVentValve";}
		
		if(sliderId != null){
			// Should probably do something different in production on an out of range feedback value
			var servoPercent = jsonSen.value;
			if(jsonSen.value > $(sliderId).prop('max')) servoPercent = $(sliderId).prop('max');
			if(jsonSen.value < $(sliderId).prop('min')) servoPercent = $(sliderId).prop('min');

			// Set color bar inside the range slider to the servo feeback value (use a linear gradient without linear color distribution)
			feedbackValue = Math.trunc(jsonSen.value)

			if(sliderId != "#oxSuperchargeValve"){
				var color = "#9C9C9C";
				if(document.getElementById("manualEnableCheck1").checked) color = "#522E63";
				$(sliderId).css('background', '-webkit-gradient(linear, left top, right top, color-stop('+servoPercent+'%, '+color+'), color-stop('+servoPercent+'%, #D7DCDF))');
			}
			
			$(sliderId+"Fb").text(feedbackValue);
		}
	}
}

//-------------------------------------Utility functions for ECUI,Socket,Timing---------------------------------

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

setInterval(function(){
    checkConnection();
    llServerConnectionActive = false;
    },4000);

function timerTick()
{
    //console.log(timeMillis);
    let time = timeMillis/1000;
    $('.timer').text(time);

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
        $('.timer').append('.0');
    }

    seqChart.update(timeMillis);

    //update pnid - doesn't work if timestamps overlap (don't try it anyways)
    let latestAction = undefined;
    for (let ind in jsonSequence.data)
    {
        let currCmd = jsonSequence.data[ind];
        let currCmdTimestamp = seqChart.getTimestamp(currCmd, jsonSequence.globals.startTime, jsonSequence.globals.startTime);
        if (currCmdTimestamp <= time)
        {

            for (let actionInd in currCmd.actions)
            {
                let currAction = currCmd.actions[actionInd];
                if ((currCmdTimestamp + currAction.timestamp) <= time)
                {
                    latestAction = currAction;
                }
                else
                {
                    break;
                }
            }
        }
        else
        {
            break;
        }

    }

    for (let key in latestAction)
    {
        if (key.includes("Solenoid") || key.includes("igniter"))
        {
            updatePNID(key, latestAction[key] !== 0);
        }

    }

    timeMillis += intervalMillis;
}

function sequenceButtonStop()
{
    $('#toggleSequenceButton').text("Start Sequence");

    //disable all other tabs
    $('.tab-button').each(function () {
        if ($(this).id === "control-tab-button" || $(this).id === "calibration-tab-button")
        {
            $(this).prop('disabled', false);
        }
    });
}

function loadSequenceSelect()
{
    $('#sequenceSelect').empty();
    for (seqInd in sequences)
    {

        if (seqInd === 0)
        {
            $('#sequenceSelect').append('<option value="' + sequences[seqInd] + '" selected>' + sequences[seqInd] + '</option>');
        }
        else
        {
            $('#sequenceSelect').append('<option value="' + sequences[seqInd] + '">' + sequences[seqInd] + '</option>');
        }
    }
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

//-------------------------------------Controls on sending Socket Messages---------------------------------

function setParameter(param) {
    // Only the master is allowed to apply changes globally
    if (master){
        socket.emit('set-param', param);
    }
}

function onMasterLockClicked(cbox) {
    if(cbox.checked) socket.emit('master-lock', 1);
    else socket.emit('master-lock', 0);
    var param = {id: cbox.id, property: 'checked', value: cbox.checked};
    setParameter(param);
}

function onMasterRequestPressed() {
	socket.emit('request-master');
}

function onSendPostSequenceComment()
{
    socket.emit('send-postseq-comment', $('#commentTextbox').val() + '\n');
    $('#sendPostSeqCommentButton').prop('disabled', true);
    setTimeout(function () {
        $('#sendPostSeqCommentButton').prop('disabled', false);
    }, 400);
}

function onToggleSequenceButton(btn)
{
    if ($(btn).text() === 'Start Sequence')
    {
        socket.emit('sequence-start', $('#commentTextbox').val() + '\n');
        $(btn).text('Abort Sequence');
        $('.tab-button').each(function () {
            if ($(btn).id === "control-tab-button" || $(btn).id === "calibration-tab-button")
            {
                //$(this).prop('disabled', true);
            }
        });
        $('#sendPostSeqCommentButton').prop('disabled', false);

        //scroll to pnid
        document.getElementById('monitorTabsContent').scrollIntoView({
            behavior: "smooth",
            block:    "start",
        });
    }
    else if ($(btn).text() === 'Abort Sequence')
    {
        abortSequence("abort from user");
        $(btn).text('Start Sequence');
        $('.tab-button').each(function () {
            if ($(btn).id === "control-tab-button" || $(btn).id === "calibration-tab-button")
            {
                $(btn).prop('disabled', false);
            }
        });
    }
}

function onTareLoadCells()
{
    socket.emit('tare');
}

function onSequenceSelectChange(value)
{
    socket.emit('sequence-set', value);
}

function sendDigitalOut(doId, doValue)
{
    let jsonDigitalOut = {};

    jsonDigitalOut.id = doId;
    jsonDigitalOut.value = doValue;

    updatePNID(doId, doValue);

    socket.emit('digital-outs-set', [jsonDigitalOut]);
}

function sendDigitalOutArr(doIds, doValue)
{
    let jsonDigitalOut = [];
    let jsonDigitalOutObj = {};

    for (let doIdsInd in doIds)
    {
        jsonDigitalOutObj = {};
        jsonDigitalOutObj.id = doIds[doIdsInd];
        jsonDigitalOutObj.value = doValue;

        updatePNID(doIds[doIdsInd], doValue);

        jsonDigitalOut.push(jsonDigitalOutObj);
    }
    socket.emit('digital-outs-set', jsonDigitalOut);
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

function sendSupercharge(setpoint, hysteresis)
{
    let jsonSupercharge = {};

    jsonSupercharge.setpoint = setpoint;
    jsonSupercharge.hysteresis = hysteresis;
    socket.emit('supercharge-set', [jsonSupercharge]);
}

function onManualControlEnable(checkbox)
{
    //console.log("manual control:", checkbox.checked);
    if (checkbox.checked)
    {
        $('.manualEnableCheck').prop('checked', true);

        $('.servoEnableCheck').prop('disabled', false);
        //only click one item, the others get updated automatically
        $('.servoEnableCheck').first().click();

        $('#toggleSequenceButton').prop('disabled', true);

		$('.manual-obj:not(.servo-enable-obj)').prop('disabled', false);
        $('#coolingPump').prop('disabled', true);
    }
    else
    {
        $('.manualEnableCheck').prop('checked', false);

        $('.servoEnableCheck').prop('disabled', true);

        $('#toggleSequenceButton').prop('disabled', false);

        $('.manual-obj:not(.servo-enable-obj)').prop('disabled', true);

        $('.digitalOut, .servoEnableCheck').each(function () {
            if ($(this).prop("checked"))
            {
                $(this).prop('checked', false);
                $(this).click();
            }
        });

		$('.servo-slider').each(function (){
			$(this).css('background', '#D7DCDF');
		});

        // avoids that heatingPump or coolingNotHeatingValve aren't disabled after disabling manual control
        $('#heatingPump').prop('disabled', true);
        $('#coolingNotHeatingValve').prop('disabled', true);
    }
}

function onServoEnable(checkbox) {
    //console.log("servo enable:", checkbox.checked);
    if (checkbox.checked)
    {
        $('.servoEnableCheck').prop('checked', true);

        $('.range-slider__value, .range-slider__feedback').attr('disabled', false);

        $('.servo-enable-obj').prop('disabled', false);

        socket.emit('servos-enable');
    }
    else
    {
        $('.servoEnableCheck').prop('checked', false);

        $('.range-slider__value, .range-slider__feedback').attr('disabled', true);

        $('.servo-enable-obj').prop('disabled', true);

        socket.emit('servos-disable');
    }
}

function abortSequence(abortMsg)
{
    clearInterval(countdownIntervalDelegate);

    seqChart.stop();

    clearInterval(intervalDelegate);

    $('.timer').css("color", "red");
    socket.emit('abort');

    sequenceButtonStop();

    setTimeout(function () {
            responsiveVoice.speak(abortMsg, "US English Female", {rate: 1.0});
        }, 1000);
    setTimeout(function () {
            emptySensorCharts();
            isContinousTransmission = true;
        }, jsonAbortSequence.globals.endTime*1000+500);

    $('#toggleSequenceButton').attr("disabled", true);
    setTimeout(function () {
        $('#toggleSequenceButton').removeAttr("disabled");
    }, jsonAbortSequence.globals.endTime*1000);

    seqChart.reset();
    seqChart.loadSequenceChart(jsonSequence);
    console.log(seqChart.chart.data);
}

function onChecklistTick(checkbox)
{
    let currId = checkbox.id.substr(14);
    checkbox.setAttribute('disabled', '');

    if(master) socket.emit('checklist-tick', currId);
}

function onSuperchargeGet()
{
    socket.emit('supercharge-get');
}

//-------------------------------------Controls on receiving Socket Messages---------------------------------

socket.on('sync-params', (params) => {
    for(var i = 0; i < params.length; i++){
        $('#' + params[i].id).prop(params[i].property, params[i].value);
        $('#' + params[i].id).trigger('input');
    }
});

socket.on('master-change', (flag) => {
	if(flag === 'master'){
		master = true;
        	$('.master-only').css('visibility', 'visible');
        	$('.master-only').css('height', 'auto');
			$('#masterLock').removeAttr('hidden')
		    $('.client-only').css('visibility', 'hidden');
        	$('.client-only').css('height', '0px');
	}
	else {	
		master = false;
        	$('.master-only').css('visibility', 'hidden');
        	$('.master-only').css('height', '0px');
			$('#masterLock').attr('hidden', '')
		    $('.client-only').css('visibility', 'visible');
        	$('.client-only').css('height', 'auto');
			if ($('.manualEnableCheck').prop('checked'))
			{
				$('#manualEnableCheck1').click();
			}
	}
});

socket.on('connect', function() {socket.emit('checklist-start'); onSuperchargeGet();});

socket.on('connect_timeout', function() {console.log('connect-timeout')});
socket.on('connect_error', function(error) {
    console.log('Connection error: ' + error);
    $('#disableAll').css("display", "block");
    $('#errorBar').css("display","block");
    $('#errorBar').css("background-color","#FF0000");
    $('#errorBar').text("Error during connection attempt: " + error);
    // Disable scrolling (as the page is not supposed to work, allow as low interaction as possible + cope with variable pnid height)
    document.body.style.overflow = 'hidden';
});

socket.on('abort', function(abortMsg) {
    console.log('abort');

    abortSequence(abortMsg);

    $('#masterRequest').prop('disabled', false);
});

socket.on('servos-load', function(jsonServosData) {
    console.log('servos-load');
    console.log(jsonServosData);
    onServosLoad(jsonServosData);

});

socket.on('supercharge-load', function(jsonSuperchargeData) {
    console.log('supercharge-load');
    console.log(jsonSuperchargeData);
    onSuperchargeLoad(jsonSuperchargeData);
});

socket.on('checklist-load', function(jsonChecklist) {
    console.log('checklist-load:');
    console.log(jsonChecklist);

	// deactivate checklist and enable toggle sequence button directly
	$('#toggleSequenceButton').prop('disabled', false);
    // if (!checklistLoaded) {
    //     checklistLoaded = true;
    //     for (itemInd in jsonChecklist)
    //     {
    //         let currItem = jsonChecklist[itemInd];
    //         let currId = currItem.id;
    //         console.log(itemInd);
    //         let newCard = $('#templates').children().first().clone();
    //         newCard.find('#headingTemp').attr('id', 'checklistItemHeading' + currId)
    //             .find('button').attr('data-target', '#checklistItemCollapse' + currId)
    //             .attr('aria-controls', 'checklistItemCollapse' + currId)
    //             .attr('for', 'checklistCheck' + currId);
    //         newCard.find('#checklistCheckTemp').attr('id', 'checklistCheck' + currId);
    //         newCard.find('#collapseTemp').attr('id', 'checklistItemCollapse' + currId)
    //             .attr('aria-labelledby', 'checklistItemHeading' + currId);

    //         newCard.find('button').text(currItem.name);

    //         let notes = $('<ul>');
    //         for (noteInd in currItem.notes)
    //         {
    //             notes.append($('<li>').text(currItem.notes[noteInd]));
    //         }
    //         newCard.find('.card-body').append(notes);

    //         $('#checklist').append(newCard);
    //     }
    // }
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
    if (!$('.manualEnableCheck').prop('checked'))
    {
        $('#toggleSequenceButton').prop('disabled', false);
    }
});

socket.on('sequence-load', function(jsonSeqsInfo) {

    sequences = jsonSeqsInfo[0];
    abortSequences = jsonSeqsInfo[1];
    jsonSequence = jsonSeqsInfo[2];
    jsonAbortSequence = jsonSeqsInfo[3];

    seqChart = new SequenceChart("sequenceChart", sequences[0]);

    $('.timer').text(jsonSequence.globals.startTime);
    if (Number.isInteger(jsonSequence.globals.startTime))
    {
        $('.timer').append('.0')
    }
    $('.timer').css("color", "green");
    console.log('sequence-load:');
    console.log(jsonSequence);

    console.log(seqChart.chart.data);
    seqChart.loadSequenceChart(jsonSequence);
    console.log(seqChart.chart.data);

    //load dropdowns
    loadSequenceSelect();

});

socket.on('sequence-start', function() {
    console.log('sequence-start:');

    //empty sensor chart div first
    setTimeout(function () {
        emptySensorCharts();
        isContinousTransmission = false;
    }, 200);

    //responsiveVoice.speak("starting sequence", "US English Female", {rate: 1});

    $('#toggleSequenceButton').text("Abort Sequence");
    $('.timer').css("color", "green");
    $('#masterRequest').prop('disabled', true);

    seqChart.start();
});

socket.on('timer-start', function () {

    intervalMillis = 100; //hard code timer step to 100 for client
    timeMillis = jsonSequence.globals.startTime * 1000;
    endTime = jsonSequence.globals.endTime;
    responsiveVoice.enableEstimationTimeout = true;

    countdownTime = jsonSequence.globals.startTime;
    countdownTimerTick();
    countdownIntervalDelegate = setInterval(countdownTimerTick, 1000);

    timerTick();
    intervalDelegate = setInterval(timerTick, intervalMillis);
});

socket.on('sequence-sync', function(time) {
    //console.log('sequence-sync:');
    timeMillis = time * 1000;

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

    $('.timer').text(endTime);
    clearInterval(intervalDelegate);
    if (Number.isInteger(endTime))
    {
        $('.timer').append('.0');
    }
    sequenceButtonStop();

    seqChart.reset();
    seqChart.loadSequenceChart(jsonSequence);
    console.log(seqChart.chart.data);

    $('#toggleSequenceButton').attr("disabled", true);
    setTimeout(function () {
            emptySensorCharts();
            isContinousTransmission = true;
            $('#toggleSequenceButton').removeAttr("disabled");
        }, 3000);

    $('#masterRequest').prop('disabled', false);
});

socket.on('sensors', function(jsonSens) {
    //console.log('sensors');

    if (!llServerConnectionActive)
    {
        llServerConnectionActive = true;
        checkConnection();
    }

    for (let sensorInd in jsonSens)
    {
        let jsonSen = jsonSens[sensorInd];

        //update pnid
        updatePNID(jsonSen.name, jsonSen.value);

        //generate plot and or update
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
            sensor.chart = new SensorChart(jsonSen.name + "Chart", sensor.chartTitle, disableSensorChartsOnLoad);
            sensor.series = sensor.chart.addSeries(jsonSen.name, jsonSen.name);
            sensor.name = jsonSen.name;

            //sensor.chart.disable();

            jsonSensors[jsonSen.name] = sensor;

        }
        sensor.chart.addSingleData(sensor.series, jsonSen.time, jsonSen.value, isContinousTransmission);

        refreshServoFeedback(jsonSen);
    }

});
