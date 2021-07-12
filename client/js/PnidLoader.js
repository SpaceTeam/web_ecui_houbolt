$.get("/pnidList", function(data)
{
    $('#pnidSelect').empty();
    for (pnidInd in data)
    {

        if (pnidInd === 0)
        {
            $('#pnidSelect').append('<option value="' + data[pnidInd] + '" selected>' + data[pnidInd] + '</option>');
        }
        else
        {
            $('#pnidSelect').append('<option value="' + data[pnidInd] + '">' + data[pnidInd] + '</option>');
        }
    }
    onPnidSelectChange(data[0]);
});

  
function onPnidSelectChange(value)
{
    $.post( "/pnid", data={"file": value}, function( data ) {
        let svg = $(data);
        $( "#pnid" ).empty();
        $( "#pnid" ).append(data);
        tankSetup();
      });
}
