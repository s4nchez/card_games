var createGame = function () {
    var result = {}, cards = [], backCard = "b1fv", history = [], elements = {}, cardSets = [];
    for (var i = 1; i <= 52; i++) {
        cards.push("" + i);
    }
    var elementIdFor = function(cardId){
        if(!elements[cardId]){
            elements[cardId] = ""+new Date().getTime()+Math.random();
        }
        return elements[cardId];
    };

    var findSet = function(setId){
        return setId && cardSets[setId.split("_")[1]];
    };

    var actionHandlers = {
        "move_card": function(action){
            var sourceCardSet = findSet(action.element_id);
            if(sourceCardSet){
                var cardToMove = sourceCardSet.pop();
                var destinationCardSet = findSet(action.details.destination_element_id);
                if(!destinationCardSet){
                    destinationCardSet = [cardToMove];
                    action.details.destination_element_id = "set_"+cardSets.length;
                    cardSets.push(destinationCardSet);
                }
            }
            return action;
        }
    };

    result.handleAction = function (action) {
        var id = history.length,
            handledAction = (actionHandlers[action.action] && actionHandlers[action.action](action)) || action;
        history.push(handledAction);
        return id;
    };

    result.actionFor = function (id, player) {
        var action = history[id];
        return {
            action: action.action,
            element_id: action.element_id || elementIdFor(action.card_id),
            card_id: action.details && action.details.owner && player === action.details.owner ? action.card_id : "b1fv",
            details: action.details
        };
    };

    result.historyFor = function (player) {
        var historyForPlayer = [];
        for (var i = 0; i < history.length; i++) {
            historyForPlayer.push(result.actionFor(i, player));
        }
        return historyForPlayer;
    };

    cardSets.push(cards);

    history.push({
        action:"initial_stack",
        element_id: "set_0",
        stack:"0"
    });

    return result;
};
