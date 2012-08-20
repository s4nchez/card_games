/*global _, jQuery, console, Backbone, EventSource*/

var CardGame = CardGame || {};

(function () {
    "use strict";

    CardGame.SseTransport = function () {
        var transport = {},
            player,
            handleNextMessages = function (messageWrapper) {
                var messages = messageWrapper.messages;
                messages.forEach(function (message) {
                    console.log('SseTransport: received ' + JSON.stringify(message));
                    if (message.message_type === "invalid_command") {
                        console.error("Received error message: " + JSON.stringify(message.details));
                    }
                    console.log("Is actor? %s", message.actor === player);
                    transport.trigger(message.message_type, message.details, message.actor === player);
                });
            },
            startMessageStreamEventSource = function () {
                var messageStreamEventSource = new EventSource('/message-stream');
                messageStreamEventSource.addEventListener('messages', function (e) {
                    handleNextMessages(JSON.parse(e.data));
                });
                messageStreamEventSource.addEventListener('open', function (e) {
                    console.log('/message-stream connection opened');
                });
                messageStreamEventSource.addEventListener('error', function (e) {
                    if (e.readyState === EventSource.CLOSED) {
                        console.log('/message-stream connection closed');
                    }
                });
            };

        _.extend(transport, Backbone.Events);

        transport.init = function () {
            jQuery.getJSON("/current-state", function (data) {
                player = data.player;
                transport.trigger("InitialState", data.current_state);
            });
            startMessageStreamEventSource();
        };

        transport.sendCommand = function (command, details) {
            jQuery.getJSON("/command/" + command, {details: details.join(",")}, function (data) {
                console.log("command result:" + data.result);
            });
        };

        transport.createGroup = function (sourceGroupId, cardIdx, cardPosition) {
            console.debug("create_group (%s, %s, %o)", sourceGroupId, cardIdx, cardPosition);
            var params = {
                "source_group_id": sourceGroupId,
                "card_idx": cardIdx,
                "position": cardPosition
            };
            jQuery.post("/command/group", params, function (data, textStatus) {
                console.log("command result: " + data.result);
            }, "json");
        };

        transport.moveCard = function (sourceGroupId, sourceCardIdx, targetGroupId, targetCardIdx) {
            // how to set player?
            console.debug("transport.moveCard(%s, %s, %s, %s)",
                sourceGroupId, sourceCardIdx, targetGroupId, targetCardIdx);

            var params = {
                "source_group_id": sourceGroupId,
                "source_group_card_idx": sourceCardIdx,
                "target_group_id": targetGroupId,
                "target_group_card_idx": targetCardIdx
            };
            // TODO think about doing a PUT on a card instead?
            jQuery.post("/command/movecard", params, function (data, textStatus) {
                console.debug("moveCard received response <%o, %o>", data, textStatus);
            }, "json");
        };

        return transport;
    };

}());