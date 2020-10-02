module.exports = {

    onLLServerConnect: function(client, msgRecvCallback) {

        console.log('Client connect. Client local address : ' + client.localAddress + ':' + client.localPort + '. client remote address : ' + client.remoteAddress + ':' + client.remotePort);

        client.setEncoding('ascii');

        client.setTimeout(1000);

        // When receive client data.
        client.on('data', function (data) {
            //console.log('client message');
            msgRecvCallback(data);
        });

        // When client disconnects.
        client.on('end', function () {
            console.log('Client disconnect.');

            // Get current connections count.
            // server.getConnections(function (err, count) {
            //     if(!err)
            //     {
            //         // Print current connection count in server console.
            //         console.log("There are %d connections now. ", count);
            //     }else
            //     {
            //         console.error(JSON.stringify(err));
            //     }
            //
            // });
        });

        // When client timeout.
        client.on('timeout', function () {
            console.log('Client request time out. ');
        })

        client.on('error', function(err) {
            // process error here
            console.log(err);
        });

        return client;
    },

    onCreateTCP: function(server) {

        // Get server address info.
        var serverInfo = server.address();

        var serverInfoJson = JSON.stringify(serverInfo);

        console.log('TCP server listen on address : ' + serverInfoJson);

        server.on('close', function () {
            console.log('TCP server socket is closed.');
        });

        server.on('error', function (error) {
            console.error(JSON.stringify(error));
        });
    },

    sendMessage: function(client, type, content={})
    {
        if (client !== undefined) {
            let msg = {};
            msg.type = type;
            msg.content = content;

            // console.log("-JSON-----------------");
            // console.log(msg);
            // console.log("-STR-----------------");
            let strMsg = JSON.stringify(msg);
            // console.log(strMsg);
            
            //Header used to identify the packet length
            var header = new Uint8Array(2);
            var strLen = strMsg.length;
            header[1] = strLen & 0xFF;
            header[0] = (strLen >> 8) & 0xFF;

            client.write(header);
            client.write(strMsg);

        }
        else
        {
            console.error("cannot send to llserver, no connection established");
        }
    }
};