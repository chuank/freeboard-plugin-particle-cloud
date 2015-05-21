(function () {
        /*
            Datasource Definition - what shows up on the dialog box
        */

        freeboard.loadDatasourcePlugin({
                "type_name": "particleSSE",
                "display_name": "Particle Local Cloud SSE",
                "description": "Subscribe to SSE (Server-Sent-Events) broadcast by the <strong>Particle Local Cloud</strong>.",
                "settings": [
                        /*      TODO #1: Add DEVICEID filtering support once local cloud device firehose is fixed by Particle.io
                        {
                                name: "deviceId",
                                display_name: "Device ID",
                                description: '',
                                type: "text",
                        },
                        */
                        {
                                name: "cloudURL",
                                display_name: "Local Cloud URL",
                                description: 'example: http://particle.local:8080',
                                type: "text",
                        },
                        {
                                name: "accessToken",
                                display_name: "Local Cloud Access Token",
                                description: '',
                                type: "text",
                        },
                        {
                                name: "eventName",
                                display_name: "Event Name",
                                description: '',
                                type: "text",
                        }
                ],
                newInstance: function (settings, newInstanceCallback, updateCallback) {
                        newInstanceCallback(new sseDatasource(settings, updateCallback));
                }
        });

        /*
            Datasource Implementation
        */
        var sseDatasource = function (settings, updateCallback) {

                var self = this;
                var currentSettings = settings;
                var eventSource;
                var keepAliveTimer = null;
                var keepAliveInterval = 30;         // seconds

                function checkAlive() {
                    // check if EventSource connection is still alive; if it is, reset the timer, if not, let the timeout force a disconnect/reconnect
                    if(keepAliveTimer != null) clearTimeout(keepAliveTimer);
                    keepAliveTimer = setTimeout(self.updateNow, keepAliveInterval * 1000);
                }

                function startSSE() {
                    /* current release of the local Particle spark-server limits us to view SSEs only via the public firehose, i.e. no device-specific information can be rou$
                       FIREHOSE: curl -H "Authorization: Bearer [access_token]" http://particle.local:8080/v1/events/[eventname] (or empty for ALL events)
                       DEVICE-SPECIFIC (as yet unsupported): curl -H "Authorization: Bearer [access_token]" http://particle.local:8080/v1/devices/[deviceID]/events
                    */

                    eventSource = new EventSource(currentSettings.cloudURL + "/v1/events/" + currentSettings.eventName + "?access_token=" + currentSettings.accessToken);

                    eventSource.addEventListener('open', function(e) {
                        switch( e.target.readyState ) {
                          // if reconnecting
                          case EventSource.CONNECTING:
                            console.log("EVENTSOURCE_ERR: SSE Reconnecting…");
                            break;
                          // if error was fatal
                          case EventSource.CLOSED:
                            console.log("EVENTSOURCE_ERR: Connection failed. Will not retry.");
                            break;
                        }
                        console.log("EVENTSOURCE: Opened new connection for event: " + currentSettings.eventName);
                    },false);

                    eventSource.addEventListener('error', function(e) {
                        switch( e.target.readyState ) {
                          // if reconnecting
                          case EventSource.CONNECTING:
                            console.log("EVENTSOURCE_ERR: SSE Reconnecting…");
                            break;
                          // if error was fatal
                          case EventSource.CLOSED:
                            console.log("EVENTSOURCE_ERR: Connection failed. Will not retry.");
                            break;
                        }
                    },false);

                    eventSource.addEventListener(currentSettings.eventName, function(e) {
                        // reset the keepAlive interval timer!
                        checkAlive();
                        var parsedData = JSON.parse(e.data);
                        updateCallback(parsedData);
                    }, false);
                }

                function disposeSSE() {
                        // dispose of EventSource SSE connection if it already exists
                        if(eventSource != undefined) {
                                console.log("EVENTSOURCE: closing connection");
                                eventSource.close();
                                eventSource = undefined;
                        }
                }

                self.updateNow = function () {
                        disposeSSE();           // always get rid of previous SSE first
                        checkAlive();
                        startSSE();
                }

                self.onDispose = function () {
                        disposeSSE();
                }

                self.onSettingsChanged = function (newSettings) {
                        currentSettings = newSettings;
                                self.updateNow();
                        }
                        console.log("EVENTSOURCE: settings changed, re-initialising");
                };
        }
());
