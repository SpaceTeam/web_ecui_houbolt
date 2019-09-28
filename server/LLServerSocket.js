module.exports = {
    onLLServerConnect: function(client, msgRecvCallback) {

        console.log('Client connect. Client local address : ' + client.localAddress + ':' + client.localPort + '. client remote address : ' + client.remoteAddress + ':' + client.remotePort);

        client.setEncoding('ascii');

        client.setTimeout(1000);

        // When receive client data.
        client.on('data', function (data) {

            console.log('client message');
            msgRecvCallback(data);
        });

        // When client send data complete.
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
        let msg = {};
        msg.type = type;
        msg.content = content;

        let correct = true;
        switch (type) {
            case 'abort':
                break;
            case 'sequence-start':
                break;
            default:
                console.error("message not supported");
                correct = false;
        }

        if (correct)
        {
            let strMsg = JSON.stringify(msg);
            client.write(strMsg + '\0');
        }
    }
};