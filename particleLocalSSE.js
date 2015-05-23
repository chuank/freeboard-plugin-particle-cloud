(function () {
        /*
            Datasource Definition - what shows up on the dialog box
        */

        freeboard.loadDatasourcePlugin({
                "type_name": "particleSSE",
                "display_name": "Particle Cloud SSE",
                "description": "Subscribe to SSE (Server-Sent-Events) broadcast by the <strong>Particle Cloud</strong>. Supports both Particle.io and locally-setup clouds.",
                "settings": [
                        /*      TODO #1: Add DEVICEID filtering support once local cloud device firehose is fixed by Particle.io
                        {
                                name: "deviceId",
                                display_name: "Device ID",
                                description: 'Device ID to subscribe to',
                                type: "text"
                        },
                        */
                        {
                                name: "cloudURL",
                                display_name: "Cloud URL",
                                description: 'example: http://particle.local:8080 or https://particle.io (port number is required for a local cloud)',
                                type: "text"
                        },
                        {
                                name: "accessToken",
                                display_name: "Cloud Access Token",
                                description: '',
                                type: "text"
                        },
                        {
                                name: "eventName",
                                display_name: "Event Name",
                                description: 'Leave blank to subscribe to Cloud firehose (warning: potentially lots of data!)',
                                type: "text"
                        },
                        {
                                name: "keepAliveInterval",
                                display_name: "KeepAlive Interval",
                                description: 'Should the SSE connection go down, a keepAlive interval runs in the background to restore it. This value should be larger that your longest SSE broadcast interval (default: 30sec)',
                                type: "text",
                                default_value: "30"
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

                function checkAlive() {
                    // check if EventSource connection is still alive; if it is, reset the timer, if not, let the timeout force a disconnect/reconnect
                    if(keepAliveTimer != null) clearTimeout(keepAliveTimer);

                    var ka;
                    (currentSettings.keepAliveInterval==undefined) ? ka = 30 : ka = currentSettings.keepAliveInterval;
                    keepAliveTimer = setTimeout(self.updateNow, ka * 1000);
                }

                function startSSE() {
                    // firehose only; refer to #3
                    eventSource = new EventSource(currentSettings.cloudURL + "/v1/events/" + currentSettings.eventName + "?access_token=" + currentSettings.accessToken);

                    eventSource.addEventListener('open', function(e) {
                        switch( e.target.readyState ) {
                          // if reconnecting
                          case EventSource.CONNECTING:
                            console.log("PARTICLESSE_ERR: SSE Reconnecting…");
                            break;
                          // if error was fatal
                          case EventSource.CLOSED:
                            console.log("PARTICLESSE_ERR: Connection failed. Will not retry.");
                            break;
                        }
                        console.log("PARTICLESSE: Opened new connection for event: " + currentSettings.eventName);
                    },false);

                    eventSource.addEventListener('error', function(e) {
                        switch( e.target.readyState ) {
                          // if reconnecting
                          case EventSource.CONNECTING:
                            console.log("PARTICLESSE_ERR: SSE Reconnecting…");
                            break;
                          // if error was fatal
                          case EventSource.CLOSED:
                            console.log("PARTICLESSE_ERR: Connection failed. Will not retry.");
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
                                console.log("PARTICLESSE: closing connection");
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
                        console.log("PARTICLESSE: settings changed, re-initialising");
                };
        }
());
