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

$('#saftlButton').click(function() {
    $('#saftlButton').prop('disabled', true);
    $('#fuelMainValve').each(function () {
        let slider = $(this);
        let lastVal = slider.val();
        slider.val(slider.attr('max')).trigger('input');
        setTimeout(function () {
            slider.val(lastVal).trigger('input');
            $('#saftlButton').prop('disabled', false);
        }, 2000);
    })
});