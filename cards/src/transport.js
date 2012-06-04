var createTransport = function (server) {
    var result = {},
        game = server,
        listeners = {};

    result.send = function (action) {
        var id = game.handleAction(action);
        for (var player in listeners) {
            var actionFor = game.actionFor(id, player);
            console.log("Dispatching "+JSON.stringify(actionFor));
            listeners[player].callback(actionFor);
        }
    };
    result.bind = function (player, callback) {
        listeners[player] = {
            player:player,
            callback:callback
        };
    };
    result.readyToPlay = function (player) {
        var actions = game.historyFor(player);
        for (var i = 0; i < actions.length; i++) {
            listeners[player].callback(actions[i]);
        }
    };

    return result;
};
