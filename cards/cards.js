

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

    result.handleAction = function (action) {
        var id = history.length;
        history.push(action);
        return id;
    };

    result.actionFor = function (id, player) {
        var action = history[id];
        return {
            action: action.action,
            element_id: action.element_id && elementIdFor(action.card_id),
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
        element_id:0,
        stack:"0"
    });

    return result;
};

var createTransport = function () {
    var result = {},
        game = createGame(),
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

var createGameStage = function (canvasId, transport) {
    var elements = {},
        canvas = oCanvas.create({
        canvas:"#" + canvasId
    }), actionHandlers, createCard, createSet;

    createCard = function(action){
        var result = {},
        image = canvas.display.image({
            x:10,
            y:10,
            origin:{ x:"top", y:"left" },
            image:"classic-cards/" + action.card_id + ".png"
        });
        canvas.addChild(image);
        image.dragAndDrop({
            end: function(){
                transport.send({
                    action: "change_position",
                    element_id: action.element_id,
                    details: {
                        x: image.abs_x,
                        y: image.abs_y
                    }
                });
            }
        });
        result.moveTo = function(x,y){
            image.moveTo(x, y);
            canvas.redraw();
        };
        return result;
    };

    createSet = function(action){
        var result = {},
            cards = [],
            setImage = canvas.display.rectangle({
            x: 10,
            y: 10,
            width: 87,
            height: 111,
            stroke: "outside 1px rgba(0, 0, 0, 0.5)"
        });
        canvas.addChild(setImage);
        for(var i =0; i < 5; i++){
            var image = canvas.display.image({
                x:15+i,
                y:15+i,
                origin:{ x:"top", y:"left" },
                image:"classic-cards/b1fv.png"
            });
            canvas.addChild(image);
            cards.push(image)
        }
        setImage.dragAndDrop({
            end: function(){
                transport.send({
                    action: "change_position",
                    element_id: action.element_id,
                    details: {
                        x: setImage.abs_x,
                        y: setImage.abs_y
                    }
                })
            }
        });
        result.moveTo = function(x,y){
            setImage.moveTo(x,y);
            for(var i =0; i < cards.length;i++){
                cards[i].moveTo(x+5+i, y+5+i);
            }
            canvas.redraw();
        };
        return result;
    };


    actionHandlers = {
        "add_card": function(action){
            elements[action.element_id] = createCard(action);
        },
        "initial_stack": function(action){
            elements[action.element_id] = createSet(action)
        },
        "change_position": function(action){
            var element = elements[action.element_id];
            if(!element){
                return;
            }
            element.moveTo(action.details.x, action.details.y);
        }
    };

    transport.bind(canvasId, function (action) {
        actionHandlers[action.action](action);
    });

    transport.readyToPlay(canvasId);
};

function init() {
    var transport = createTransport();
    createGameStage("p1", transport);
    createGameStage("p2", transport);
    document.getElementById("add_card_p1").onclick = function () {
        transport.send({
            action:"add_card",
            card_id:"1",
            details:{
                owner:"p1"
            }
        });
    };

}

