(function () {
        var sseDatasource = function (settings, updateCallback) {
                var self = this;
                var currentSettings = settings;

                self.updateNow = function () {
                    /* current release of the local Particle spark-server limits us to view SSEs only via the public firehose, i.e. no device-specific information can be routed
                       FIREHOSE: curl -H "Authorization: Bearer [access_token]" http://particle.local:8080/v1/events/[eventname] (or empty for ALL events)
                       DEVICE-SPECIFIC (as yet unsupported): curl -H "Authorization: Bearer [access_token]" http://particle.local:8080/v1/devices/[deviceID]/events
                    */

                    var eventSource = new EventSource(currentSettings.cloudURL + "/v1/events/" + currentSettings.eventName + "?access_token=" + currentSettings.accessToken);
                    //var eventSource = new EventSource("http://localhost:8080/v1/devices/" + currentSettings.deviceId + "/events/?access_token=" + currentSettings.accessToken);

                    eventSource.addEventListener('open', function(e) { },false);

                    eventSource.addEventListener('error', function(e) { },false);

                    eventSource.addEventListener(currentSettings.eventName, function(e) {
                        var parsedData = JSON.parse(e.data);
                        updateCallback(parsedData);
                    }, false);
                }

                self.onDispose = function () {
                        // dispose of EventSource SSE connection
                        eventSource.close();
                }

                self.onSettingsChanged = function (newSettings) {
                        currentSettings = newSettings;
                                self.updateNow();
                        }
                };

                freeboard.loadDatasourcePlugin({
                        "type_name": "particleSSE",
                        "display_name": "Particle Local Cloud SSE",
                        "settings": [
                                /*      TODO, once local cloud device firehose is fixed by Particle.io
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
                                        description: 'example: http://localhost:8080',
                                        type: "text",
                                },
                                {
                                        name: "accessToken",
                                        display_name: "Access Token",
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
        }
());