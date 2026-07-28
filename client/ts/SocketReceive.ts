socket.on("field_get_response", (data: FieldGetResponse): void => {
    console.log("received field_get_response", data);
    eventRegistrar.invokeFieldGetEvent(data);
});