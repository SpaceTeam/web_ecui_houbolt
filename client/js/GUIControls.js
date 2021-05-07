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

        console.log(event.code, event.shiftKey, event.altKey);

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
    $('#oxfillMainValve').each(function () {
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