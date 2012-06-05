var GAME = GAME || {};

GAME.createCard = function(canvas, transport, elementId, card, x, y){
    var result = {},
        image = canvas.display.image({
            x:x,
            y:y,
            origin:{ x:"top", y:"left" },
            image:"classic-cards/" + card + ".png"
        });
    canvas.addChild(image);
    image.dragAndDrop({
        end: function(){
            transport.send({
                action: "change_position",
                element_id: elementId,
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
    result.destroy = function(){
        canvas.removeChild(image);
    };
    return result;
};

GAME.createSet = function(canvas, transport, elementId, setType, cards, initialX, initialY){
    var drawingStrategies = {},
        createBorder = function () {
        var border = {},
            borderImage = canvas.display.rectangle({
                x:initialX,
                y:initialY,
                width:87,
                height:111,
                stroke:"outside 1px rgba(0, 0, 0, 0.5)"
            });
        canvas.addChild(borderImage);
        borderImage.dragAndDrop({
            end:function () {
                transport.send({
                    action:"change_position",
                    element_id:elementId,
                    details:{
                        x:borderImage.abs_x,
                        y:borderImage.abs_y
                    }
                })
            }
        });
        border.moveTo = function (x, y) {
            borderImage.moveTo(x, y);
        };
        return border;
    };

    drawingStrategies["stack"] = function () {
        var stack = {}, border = createBorder(), pile, topCard, x = initialX, y = initialY,
            createPile = function () {
                var pile = {}, cardComponents = [];
                for (var i = 0; i < 5; i++) {
                    var image = canvas.display.image({
                        x:x + 5 + i,
                        y:y + 5 + i,
                        origin:{ x:"top", y:"left" },
                        image:"classic-cards/b1fv.png"
                    });
                    canvas.addChild(image);
                    cardComponents.push(image)
                }
                pile.moveTo = function (x, y) {
                    for (var i = 0; i < cardComponents.length; i++) {
                        cardComponents[i].moveTo(x + 5 + i, y + 5 + i);
                    }
                };
                return pile;
            };
        pile = createPile();
        topCard = GAME.createCard(canvas, transport, elementId, cards[0], x+10, y+10);
        stack.moveTo = function (newX, newY) {
            x = newX;
            y = newY;
            border.moveTo(newX, newY);
            pile.moveTo(newX,newY);
            topCard.moveTo(newX+10,newY+10);
            canvas.redraw();
        };
        stack.updateTopCard = function(cardId){
          topCard.destroy();
          topCard = GAME.createCard(canvas, transport, elementId, cardId, x+10, y+10);
        };
        return stack;
    };

    drawingStrategies["single"] = function(){
        return GAME.createCard(canvas, transport, elementId, cards[0], initialX+10, initialY+10);
    };

    return drawingStrategies[setType]();
};


GAME.createGameStage = function (canvasId, transport) {
    var elements = {},
        canvas = oCanvas.create({
            canvas:"#" + canvasId
        }), actionHandlers;

    actionHandlers = {
        "add_card": function(action){
            elements[action.element_id] = GAME.createCard(canvas, transport, action.element_id, action.card_id, 10, 10);
        },
        "initial_stack": function(action){
            elements[action.element_id] = GAME.createSet(canvas, transport, action.element_id, "stack", [action.card_id], 10, 10);
        },
        "change_position": function(action){
            var element = elements[action.element_id];
            if(!element){
                return;
            }
            element.moveTo(action.details.x, action.details.y);
        },
        "move_card": function(action) {
            elements[action.details.destination_element_id] = GAME.createSet(canvas, transport, action.details.destination_element_id, "single", [action.card_id], 100, 10);
            elements[action.element_id].updateTopCard(action.details.updated_card_id)
        }
    };

    transport.bind(canvasId, function (action) {
        actionHandlers[action.action](action);
    });

    transport.readyToPlay(canvasId);
};

