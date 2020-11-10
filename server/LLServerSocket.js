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
        });

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
        const Buffer = require('buffer').Buffer;

        const MAX_MSG_LENGTH = 65536-1; //2^16 - 1
        if (client !== undefined) {
            let msg = {};
            msg.type = type;
            msg.content = content;

            console.log(msg);
            // let correct = true;
            // switch (type) {
            //     case 'abort':
            //         break;
            //     case 'sequence-start':
            //         break;
            //     default:
            //         console.error("message not supported");
            //         correct = false;
            // }
            //
            // if (correct) {
                console.log("------------------");
                console.log(msg);
                console.log("------------------");
                let strMsg = JSON.stringify(msg) + '\n';
                let strMsgLen = strMsg.length;
                if (strMsgLen <= MAX_MSG_LENGTH)
                {
                    let strMsgArray = Buffer.from(strMsg, 'ascii');
                    let uint8Array = new Uint8Array(strMsgLen + 2);

                    let LSB = strMsgLen & 0x00FF;
                    let MSB = strMsgLen >> 8;
                    uint8Array.set([MSB, LSB],0);
                    uint8Array.set(strMsgArray,2);
                    client.write(uint8Array);
                }

            // }
        }
        else
        {
            console.error("cannot send to llserver, no connection established");
        }
    }
};