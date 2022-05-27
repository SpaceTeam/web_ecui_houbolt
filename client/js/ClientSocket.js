//-------------------------------------Global Variables | Yikes!!!---------------------------------
var socket = io();

var sequences = [];
var abortSequences = [];
var jsonSequence = {};
var jsonAbortSequence = {};
var jsonSensors = {};
var jsonStateLabels = [];
var checklistLoaded = false;
var isContinousTransmission = true;

var seqChart = new SequenceChart("sequenceChart", "Sequence");

var endTime;
var timeMillis;
var intervalMillis;
var intervalDelegate;

var countdownTime;
var countdownIntervalDelegate;

var isMaster = false;

var disableSensorChartsOnLoad = true;

var allCommandElementsList;

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

var lastModalTriggeredElement = undefined;


//-------------------------------------PNID Events---------------------------------

function onPNIDInput(stateName, value, timestamp)
{
    var stateNameFixed = stateName //.replace(":sensor","");
    if (!stateNameFixed.includes("gui"))
    {
        stateNameFixed = "gui:" + stateNameFixed;
    }
    console.log(stateNameFixed, value, timestamp);
    //TODO: maybe append gui elsewhere (in pnid) but probably the best to change it here
    socket.emit("states-set", [{"name": stateNameFixed, "value": value, "timestamp": timestamp}]);
}

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

// Set colored progress bar in servo slider for visual feedback
function refreshServoFeedback(jsonSen, shallSetSliderToFeedbackPosition){

	if(jsonSen.name.includes("Valve")){
		var sliderId = null;
		if(jsonSen.name.includes("fuel")){ sliderId = "#fuelMainValve";}
		else if(jsonSen.name.includes("Supercharge")){ sliderId = "#oxSuperchargeValve"; }
		else if(jsonSen.name.includes("MainValve")){ sliderId = "#oxMainValve";}
		
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

				if (shallSetSliderToFeedbackPosition)
				{
					$(sliderId).val(feedbackValue)
				}
			}
			
			$(sliderId+"Fb").text(feedbackValue);
		}
	}
}

//-------------------------------------Utility functions for ECUI,Socket,Timing---------------------------------

function onLLServerConnect()
{
    $('#statusBar').attr('hidden', '');
    $('#statusBar').text(null);
}

function onLLServerDisconnect()
{
    $('#statusBar').removeAttr('hidden');
    $('#statusBar').text("No Connection to LLServer");
}

//TODO: NOT COMPATIBLE WITH NEW PNID
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

function insertTestCommands()
{
    loadCommands(JSON.parse('{"commandList":[{"commandName":"ox_purge_solenoid:GetDutyCycle","parameterNames":["paramA","paramB"]},{"commandName":"ox_purge_solenoid:GetMeasurement","parameterNames":["paramA","paramB"]},{"commandName":"ox_purge_solenoid:RequestCalibrate","parameterNames":["paramA","paramB"]},{"commandName":"ox_purge_solenoid:SetMeasurement","parameterNames":["paramA","paramB"]},{"commandName":"ox_pressurize_solenoid:SetSomething","parameterNames":["param2","param4"]},{"commandName":"ox_pressurize_solenoid:GetSomething","parameterNames":["param2","param4"]}]}')["commandList"]);
}

var commandCategories = []; //I dislike that this is global, but I don't see an easy fix for this otherwise. I'd need to read all already created categories and re-parse the category names from them which sucks more than this global variable imo
var commandStates = [];

function loadCommands(jsonCommands)
{
    $("#commandSearch").empty();
    let commandContainer = $('#command-list');
    //commandContainer.empty();
    let commandTemplate = $('#tempCommand').children().first().clone();

    jsonCommands.forEach(command => {
        let commandCategory = command["commandName"].split(":")[0];
        let commandName = command["commandName"].split(":")[1];
        let commandCategoryHtml = $("#tempCommandCategory").first().clone();
        let categoryData = commandCategoryHtml.find("div.card-body").first()
        if (commandCategories.includes(commandCategory))
        {
            categoryData = $(`#${commandCategory}`).find("div.card-body").first();
        }
        else
        {
            let categoryHeader = commandCategoryHtml.find("div.card-header").first();
            commandCategories.push(commandCategory);
            commandCategoryHtml.attr("id", commandCategory);
            categoryHeader.attr("id", "heading_" + commandCategory);
            let headerButton = categoryHeader.find("button");
            headerButton.attr("data-target", `#collapse_${commandCategory}`).attr("aria-controls", `collapse_${commandCategory}`).html(commandCategory);
            commandCategoryHtml.find("div.collapse").attr("aria-labelledby", "heading_" + commandCategory).attr("id", "collapse_" + commandCategory);
            commandContainer.append(commandCategoryHtml);
        }
        let commandHtml = commandTemplate.clone();
        commandHtml.children().first().attr("id",command["commandName"]);
        commandHtml.find('.command-label').eq(0).text(commandName);
        var prevGroup = commandHtml.find('.parameter-group').eq(0);
        var parameterGroup = commandHtml.find('.parameter-group').eq(0).clone();
        
        for (let i=0; i<command["parameterNames"].length; i++)
        {
            if (i % 2 == 0 && i != 0)
            {
                let buttonSpacerTag = commandHtml.find('button').first().clone();
                //use visibility hidden to keep button width as spacer
                buttonSpacerTag.attr('disabled', 'true');
                buttonSpacerTag.css("visibility","hidden");
                let breakTag = $('<div class="w-100"></div>');
                let spacerTag = $('<div class="col"></div>');
                prevGroup.after(buttonSpacerTag);
                prevGroup = buttonSpacerTag;
                prevGroup.after(breakTag);
                prevGroup = breakTag;
                prevGroup.after(spacerTag);
                prevGroup = spacerTag;
            }
            parameterGroup.find('.parameter-name').text(command["parameterNames"][i]);
            prevGroup.after(parameterGroup);
            prevGroup = parameterGroup;
            parameterGroup = prevGroup.clone();
        }

        if (command["commandName"].match(/.*:[GS]et[A-Z0-9].*/))
        {
            console.log("getter setter found: ", command["commandName"]);
            let currValueTemp = $('#tempCommandCurrValue').children().first().clone();
            
            //TODO: THIS IS DIRTY CODE PLS EXTEND LLSERVER TO TRANSMIT RELATED STATE NAME
            let splitCommand = command["commandName"].split(':');
            let relatedStateName = splitCommand[0]+":"+splitCommand[1].substring(3);
            //---------------
            if (!commandStates.includes(relatedStateName))
            {
                commandStates.push(relatedStateName);
            }
            
            currValueTemp.find("input").attr("data-command-state-name", relatedStateName);
            prevGroup.after(currValueTemp);
        }
        commandHtml.find('.parameter-group').eq(0).remove();
        commandHtml.find('.parameter').inputSpinner();

        //console.log("appending", commandHtml, "to", categoryData)
        categoryData.append(commandHtml);
    }); 
    //console.log("categories:", commandCategories);
    allCommandElementsList = $("#command-container").find("div.command");
}

//-------------------------------------Controls on sending Socket Messages---------------------------------

function onMasterLockClicked(cbox) {
    if(cbox.checked) socket.emit('master-lock', 1);
    else socket.emit('master-lock', 0);
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
    if ($(btn).text() === 'Start Sequence' || $(btn).text() === 'Pad not idle! Retry Seq')
    {
        if (getRocketInternalStateName() != "PAD_IDLE")
        {
            $(btn).text("Pad not idle! Retry Seq");
        }
        else
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
            // document.getElementById('monitorTabsContent').scrollIntoView({
            //     behavior: "smooth",
            //     block:    "start",
            // });
        }
        
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

function onSequenceSelectChange(value)
{
    socket.emit('sequence-set', value);
}

function sendServo(servoId, servoValue)
{
    let jsonServo = {};

    jsonServo.id = servoId;
    jsonServo.value = servoValue;
    socket.emit('states-set', [jsonServo]);
}

function onAutoAbortChange(checkbox)
{
    console.log("auto abort clicked");
    socket.emit('auto-abort-change', checkbox.checked);
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

function onCommandExecute(command)
{
    var params = [];

    $(command).parent().find(".parameter[type=number]").each(function() {
        console.log($(this).get(0).outerHTML);
        params.push(Number($(this).val()));
    });

    
    var commandsMsg = {};
    commandsMsg["commandName"] = $(command).parent().attr('id');
    commandsMsg["params"] = params;
    commandsMsg["testOnly"] = false;
    console.log(commandsMsg);
    if(master) socket.emit('commands-set', [commandsMsg]);
}

//-------------------------------------Controls on receiving Socket Messages---------------------------------

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

socket.on('master-lock', (flag) => {
    if(flag == 1) $('#masterLockBox').prop('checked', true);
    else $('#masterLockBox').prop('checked', false);
});

socket.on('connect', function() {socket.emit('checklist-start'); socket.emit('commands-load'); socket.emit('states-load'); socket.emit('states-start');});

socket.on('connect_timeout', function() {console.log('connect-timeout')});
socket.on('connect_error', function(error) {
    console.log('Connection error: ' + error);
    $('#disableAll').css("display", "block");
    $('#errorBar').css("display","block");
    $('#errorBar').css("background-color","#FF0000");
    $('#errorBar').text("Connection lost to webserver!");
    // Disable scrolling (as the page is not supposed to work, allow as low interaction as possible + cope with variable pnid height)
    document.body.style.overflow = 'hidden';
});

socket.on('llserver-connect', function()
{
    onLLServerConnect();
});

socket.on('llserver-disconnect', function()
{
    onLLServerDisconnect();
});

socket.on('abort', function(abortMsg) {
    console.log('abort');

    abortSequence(abortMsg);

    $('#masterRequest').prop('disabled', false);
});

socket.on('auto-abort-change', function(isAutoAbortActive) {
    console.log('auto-abort-change', isAutoAbortActive);

    $('#autoAbortCbox').prop('checked', isAutoAbortActive);
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

socket.on('commands-load', function(jsonCommands) {

    console.log('commands-load');
    console.log(jsonCommands);
    loadCommands(jsonCommands);

});

//TODO: maybe change to commands-result to also receive if everything went fine
socket.on('commands-error', function(jsonCommandErrors) {

    console.log('commands-error');
    console.log(JSON.stringify(jsonCommandErrors, null, 4));
    alert(JSON.stringify(jsonCommandErrors, null, 4));
    

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

var firstSensorFetch = true;

socket.on('states', function(jsonStates) {
    // console.log('states');
    //console.log(JSON.stringify(jsonStates, null, 2));

    //PRINT non sensor values only
    for (index in jsonStates)
    {
    	if (!jsonStates[index]["name"].includes(":sensor") || jsonStates[index]["name"].includes("gui:"))
    	{
    		console.log(JSON.stringify(jsonStates[index], null, 2))		
    	}
    }

    // for (index in jsonStates)
    // {
    // 	if (jsonStates[index]["name"] == "lcb_engine_unused_ch0:sensor")
    // 	{
    // 		console.log(JSON.stringify(jsonStates[index], null, 2))		
    // 	}
    // }
    updateCommandList(jsonStates, commandStates);
    updatePNID(jsonStates);
});

socket.on('states-load', function(jsonStates) {
    console.log('states-load');
    console.log(jsonStates);
    jsonStateLabels = jsonStates;
    setStateNamesPNID(jsonStateLabels);
});
