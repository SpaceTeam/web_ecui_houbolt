
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

let previousMatchCategories = new Map();
let previousMatches = new Map();

function updateCommandSearch(commandListName, input)
{
    let commandList = undefined;
    let typePrefix = undefined
    if (commandListName == "can") 
    {
        typePrefix = "can";
        commandList = commandContainers[typePrefix];
    }
    else if (commandListName == "lora")
    {
        typePrefix = "lora";
        commandList = commandContainers[typePrefix];
    }

    let matches = new Map();
    let matchCategories = new Map();

    if (input.value == "")
    {
        commandList.removeClass("search-results");
    }
    else
    {
        let regex = new RegExp(`.*${input.value}.*`, 'i');

        let matchOverflow = false;
        for (let category of Object.keys(commandsCache[typePrefix]))
        {
            for (let commandName of Object.keys(commandsCache[typePrefix][category]))
            {
                let command = commandsCache[typePrefix][category][commandName];
                let commandId = mergeCommandName(category, commandName);

                if (commandName == "_container")
                {
                    continue;
                }

                if (regex.test(commandId))
                {
                    matches.set(commandId, command[0]);
                    let {category, name} = splitCommandName(commandId);
                    if (!matchCategories.has(category))
                    {
                        matchCategories.set(category, createOrLoadCommandCategoryContainer(typePrefix, category));
                    }
                }

                if (matches.size > 2000)
                {
                    // technically performance is now easily good enough to remove this limit,
                    // but realistically what does anyone do with more than 2000 search results

                    matchOverflow = true;
                    matches.clear();
                    matchCategories.clear();
                    break;
                }
            }

        }
        if (matches.size === 0)
        {
            // found no matches. unhide entire list and prepend/update indicator that no results were found
            let searchIndicatorText = `No commands containing '${input.value}' found.`;
            if (matchOverflow)
            {
                // found too many matches, could lead to bad performance and high RAM usage
                searchIndicatorText = `Too many results containing '${input.value}' found. Refine your search more.`;
            }

            if ($("#empty-search-indicator").length == 0)
            {
                commandList.prepend(`<div id="empty-search-indicator" class="card indicator"><div style="text-align: center; margin: 1.4em; font-size: 16px" disabled>${searchIndicatorText}</div></div>`);
            }
            else
            {
                $("#empty-search-indicator").children().first().text(searchIndicatorText);
            }

            commandList.removeClass("search-results");

            // TODO consider manually cleaning all result classes here
            // it should be irrelevant and "unnecessary" extra work, but if the logic for keeping track
            // of matches breaks down at any point, as simple as it may be, search results won't be
            // cleared properly leading to the results getting longer and longer with old matches
        }
        else
        {
            //found matches, removing the found no matches indicator
            document.getElementById("empty-search-indicator")?.remove();
            commandList.addClass("search-results");

            // show matched elements
            for (const [matchId, element] of matches)
            {
                element.classList.add("result-command");
            }
            for (const [categoryId, category] of matchCategories)
            {
                category.addClass("result-category");
            }
        }

        // unmark elements from "matched" if they aren't matched anymore
        if (previousMatches.size > 0)
        {
            for (let [prevMatchId, element] of previousMatches)
            {
                if (!matches.has(prevMatchId))
                {
                    element.classList.remove("result-command");
                }
            }
        }

        // TODO I don't love that the category (both here and when finding matching)
        // uses the jquery elements to add classes while the individual commands use plain
        // JS, but oh well.
        // same for categories
        if (previousMatchCategories.size > 0)
        {
            for (let [prevMatchCategory, category] of previousMatchCategories)
            {
                if (!matchCategories.has(prevMatchCategory))
                {
                    category.removeClass("result-category");
                }
            }
        }
    }
    previousMatches = new Map(matches);
    previousMatchCategories = new Map(matchCategories);
}

function updateCommandList(jsonStates, commandStates)
{
	// TODO another potential optimization may be to cache the command state inputs,
	// but it seems the browser already does some caching so maybe not necessary
	let commandStateInputs = $("[data-command-state-name]");
	let statesDict = {};
	statesDict = jsonStates.reduce((statesDict, el) => {
		statesDict[el.name] = {"value": el.value, "timestamp": el.timestamp};
		return statesDict;
	}, {});
	
	let count1 = 0;
	let count2 = 0;
	let firstNames = {};
	let secondNames = {};
	for (let commandInput of commandStateInputs)
	{
		let inputName = commandInput.dataset.commandStateName;
		if (statesDict[inputName] !== undefined && commandStates["can"].includes(inputName))
		{
		    commandInput.value = statesDict[inputName]["value"];
		}
		else if (statesDict[inputName] !== undefined && commandStates["lora"].includes(inputName))
		{
		    commandInput.value = statesDict[inputName]["value"];
		}
	}
}
