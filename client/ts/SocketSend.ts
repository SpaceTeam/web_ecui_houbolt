function sendGetField(data: GetFieldRaw | GetFieldMapped): void
{
    console.log("send get_field", data);
    // TODO temporary hack while ferroflow doesn't implement the protocol correctly
    data.field.type = data.field.value_type;

    socket.emit("get_field", data);
}

function sendSetParameter(data: SetParameterRaw | SetParameterMapped): void
{
    console.log("send set_parameter", data);
    // TODO temporary hack while ferroflow doesn't implement the protocol correctly
    data.field.type = data.field.value_type;


    if (data.field.value_type == "raw")
    {
        sendSetParameterRaw(data as SetParameterRaw);
    }
    else if (data.field.value_type == "mapped")
    {
        sendSetParameterMapped(data as SetParameterMapped);
    }
}

function sendSetParameterRaw(data: SetParameterRaw): void
{
    // raw values have to be integer, make sure there's no float coming through
    data.value = Math.floor(data.value);
    if (master)
    {
        socket.emit("set_parameter", data);
    }
}

function sendSetParameterMapped(data: SetParameterMapped): void
{
    if (master)
    {
        socket.emit("set_parameter", data);
    }
}