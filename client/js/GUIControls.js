//abort if any key is pressed
document.onkeydown = function (event) {
    var seqButton = $('#toggleSequenceButton');
    console.log(seqButton.text());
    if (seqButton.text() === 'Abort Sequence')
    {
        seqButton.click();
    }
    else
    {
        var code;

        if (event.key !== undefined) {
            code = event.key;
        } else if (event.keyIdentifier !== undefined) {
            code = event.keyIdentifier;
        } else if (event.keyCode !== undefined) {
            code = event.keyCode;
        }

        // if (code === ' ' && !seqButton.prop('disabled'))
        // {
        //     seqButton.click();
        // }

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