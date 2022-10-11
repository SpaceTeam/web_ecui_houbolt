$.get("/pnidList", function(data)
{
    $('#pnidSelect').empty();
    //restore last used pnid
    let selectedPnIDIndex = 0;
    let storedPnID = window.localStorage.getItem("selectedPnID");
    if (storedPnID != null)
    {
        for (let index in data)
        {
            if (storedPnID == data[index])
            {
                selectedPnIDIndex = index;
                break;
            }
        }
        window.localStorage.removeItem("selectedPnID");
        //clean up after ourselves. even if it was found, because we set the pnid later it will store it again anyways, but is useful for cleaning invalid pnid names from localstorage
    }

    for (let pnidInd in data)
    {
        if (pnidInd === selectedPnIDIndex)
        {
            $('#pnidSelect').append('<option value="' + data[pnidInd] + '" selected>' + data[pnidInd] + '</option>');
        }
        else
        {
            $('#pnidSelect').append('<option value="' + data[pnidInd] + '">' + data[pnidInd] + '</option>');
        }
    }
    onPnidSelectChange(data[selectedPnIDIndex]);
});

  
function onPnidSelectChange(value)
{
    $.post( "/pnid", data={"file": value}, function( data ) {
        let svg = $(data);
        $( "#pnid" ).empty();
        $( "#pnid" ).append(data);
        initPNID(false, "theming/", [{theme: "lightTheme", icon: "brightness-high", type: "light"},{theme: "darkTheme", icon: "moon", type: "dark"}], value);

        window.localStorage.setItem("selectedPnID", value);
        
        clearElementBuffer();
        setStateNamesPNID(jsonStateLabels);
        //onInitValues();
      });
}
