
//abort if any key is pressed
document.onkeydown = function (event) {
    var seqButton = $('#toggleSequenceButton');
    if (seqButton.text() === 'Abort Sequence')
    {
        seqButton.click();
    }
    else
    {

        // if (code === ' ' && !seqButton.prop('disabled'))
        // {
        //     seqButton.click();
        // }

        //console.log(event.code, event.shiftKey, event.altKey);

		if (event.shiftKey && event.altKey && (event.code === 'KeyD')) {
			let isHidden = $("#debugSequenceCheck").parent().prop("hidden");
			$("#debugSequenceCheck").parent().prop("hidden", !isHidden);
		};

		if (event.code === "KeyR")
        {
            $("#resetButton").click();
        }
		else if (event.code === "KeyT")
        {
            if ($("#tareButton").length > 0)
            {
                $("#tareButton").click();
            }
        }

    }


};

//auto start sequence every 25 seconds if checkbox checked
var debugSequenceInterval = undefined;

function onDebugSequence(checkbox)
{
    if (checkbox.checked)
    {
        $('#toggleSequenceButton').click();
        debugSequenceInterval = setInterval(function () {
            $('#toggleSequenceButton').click();
        }, 25000);
    }
    else
    {
        clearInterval(debugSequenceInterval);
    }
}

$('#closeTankValve').click(function() {
    $('#closeTankValve').prop('disabled', true);
    $('.manualEnableCheck').prop('disabled', true);
    $('.servoEnableCheck').prop('disabled', true);
    $('#loadingTankValve').each(function () {
        let slider = $(this);
        let closingIntervalTime = 10;
        let closingTime = 500;
        let steps = closingTime / closingIntervalTime;
        let sliderStep = slider.val() / steps;
        let sliderCount = 0;
        let currSliderVal = slider.val();

        let closingInterval = setInterval(function () {
            currSliderVal -= sliderStep;
            slider.val(currSliderVal).trigger('input');
            sliderCount++;
            if (sliderCount === steps)
            {
                clearInterval(closingInterval);
                $('#closeTankValve').prop('disabled', false);
                $('.manualEnableCheck').prop('disabled', false);
                $('.servoEnableCheck').prop('disabled', false);
            }
        }, closingIntervalTime);
    })
});

$('#saftlButton').click(function() {
    $('#saftlButton').prop('disabled', true);
    $('.manualEnableCheck').each(function(){$(this).prop('disabled', true);});
    $('.servoEnableCheck').each(function(){$(this).prop('disabled', true);});
    $('#fuelMainValve').each(function () {
        let slider = $(this);
        let lastVal = slider.val();
        slider.val(slider.attr('max')).trigger('input');
        setTimeout(function () {
            slider.val(lastVal).trigger('input');
            $('#saftlButton').prop('disabled', false);
            $('.manualEnableCheck').each(function(){$(this).prop('disabled', false);});
            $('.servoEnableCheck').each(function(){$(this).prop('disabled', false);});
        }, 2000);
    })
});

function updateCommandSearch(commandListName, input)
{
    let commandList = undefined;
    let typePrefix = undefined
    if (commandListName == "can") 
    {
        commandList = $("#command-list");
        typePrefix = "can";
    }
    else if (commandListName == "lora")
    {
        commandList = $("#command-list-lora");
        typePrefix = "lora";
    }
    if (input.value == "")
    {
        commandList.find(".collapse").collapse('hide');
        commandList.find("div.card").each(function (index, element) {
            if ($(element).is(":hidden"))
            {
                $(element).show(200);
            }
        });
        commandList.find("li").each(function (index, element) {
            if ($(element).is(":hidden"))
            {
                $(element).show(200);
            }
        });
    }
    else
    {
        commandList.find(".collapse").collapse('show');
        let regex = new RegExp(`.*${input.value}.*`, 'i');
        let matches = [];
        let invertedMatches = [];
        for (let command of allCommandElementsList[typePrefix])
        {
            if (regex.test($(command).attr("id")))
            {
                matches.push(command);
            }
            else
            {
                invertedMatches.push(command);
            }
        }
        if (invertedMatches.length == allCommandElementsList[typePrefix].length)
        {
            //found no matches. unhide entire list and prepend/update indicator that no results were found
            if ($("#empty-search-indicator").length == 0)
            {
                commandList.prepend(`<div id="empty-search-indicator" class="card indicator"><div style="text-align: center; margin: 1.4em; font-size: 16px" disabled>No commands containing '${input.value}' found.</div></div>`);
            }
            else
            {
                $("#empty-search-indicator").children().first().text(`No commands containing '${input.value}' found.`);
            }
            commandList.find("div.card:not(div.indicator)").each(function (index, element) {
                if ($(element).is(":visible"))
                {
                    $(element).hide(200);
                }
            });
            commandList.find("li").each(function (index, element) {
                if ($(element).is(":visible"))
                {
                    $(element).hide(200);
                }
            });
        }
        else
        {
            //found matches, removing the found no matches indicator
            let showCategory = true;
            commandList.find("div.card").remove('[id="empty-search-indicator"]');
            if (invertedMatches.length > 0)
            {
                //console.log("command list begin", commandList.children());
                //for (let {categoryIndex, val} of commandList.children().entries())
                commandList.children().each(function(categoryIndex, element)
                {
                    //console.log("val", element, "children", $(element).find("li"), "index", categoryIndex);
                    let categoryCommands = $(element).find("div.command");
                    let commandMatches = []
                    for (let command of categoryCommands)
                    {
                        //console.log("command", command);
                        //check each command group if there's at least one entry in matches
                        if (matches.some(e => $(e).attr("id") === $(command).attr("id")))
                        {
                            //we found an entry in matches from this command group, this means we want to show it
                            //console.log("found match for category", categoryIndex, command);
                            if ($(element).is(":hidden"))
                            {
                                $(element).show(200);
                            }
                            if ($(command).is(":hidden"))
                            {
                                $(command).parent().show(200);
                            }
                            commandMatches.push(command);
                        }
                    }
                    if (commandMatches.length == 0)
                    {
                        if ($(element).is(":visible")) {
                            $(element).hide(100);
                        }
                    }
                });
                $(invertedMatches).each(function(index, command)
                {
                    if ($(command).is(":visible"))
                    {
                        $(command).parent().hide(100);
                        
                        
                    }
                });
                /* $(matches).each(function(index, element)
                {
                    if ($(element).is(":hidden"))
                    {
                        $(element).show(200);
                    }
                }); */
            }
        }
    }
}

function updateCommandList(jsonStates, commandStates)
{
    for (stateObj of jsonStates)
    {
        if (commandStates["can"].includes(stateObj["name"]))
        {
            $("[data-command-state-name=\""+stateObj["name"]+"\"]").val(stateObj["value"]);
        }
        else if (commandStates["lora"].includes(stateObj["name"]))
        {
            $("[data-command-state-name=\""+stateObj["name"]+"\"]").val(stateObj["value"]);
        }
    }
}