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
    return result;
};

GAME.createSet = function(canvas, transport, elementId, cards, x, y){
        var result = {},
            cardComponents = [],
            setImage = canvas.display.rectangle({
                x: x,
                y: y,
                width: 87,
                height: 111,
                stroke: "outside 1px rgba(0, 0, 0, 0.5)"
            });
        canvas.addChild(setImage);
        for(var i =0; i < 5; i++){
            var image = canvas.display.image({
                x:x+5+i,
                y:x+5+i,
                origin:{ x:"top", y:"left" },
                image:"classic-cards/b1fv.png"
            });
            canvas.addChild(image);
            cardComponents.push(image)
        }
//        cardComponents.push(
//          GAME.createCard(canvas, transport, cards[0], cards[0], x+10, y+10)
//        );
        setImage.dragAndDrop({
            end: function(){
                transport.send({
                    action: "change_position",
                    element_id: elementId,
                    details: {
                        x: setImage.abs_x,
                        y: setImage.abs_y
                    }
                })
            }
        });
        result.moveTo = function(x,y){
            setImage.moveTo(x,y);
            for(var i =0; i < cardComponents.length;i++){
                cardComponents[i].moveTo(x+5+i, y+5+i);
            }
            canvas.redraw();
        };
        return result;
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
            elements[action.element_id] = GAME.createSet(canvas, transport, action.element_id, [action.card_id], 10, 10);
        },
        "change_position": function(action){
            var element = elements[action.element_id];
            if(!element){
                return;
            }
            element.moveTo(action.details.x, action.details.y);
        },
        "move_card": function(action) {
            elements[action.details.destination_element_id] = createSet(action.details.destination_element_id);
        }
    };

    transport.bind(canvasId, function (action) {
        actionHandlers[action.action](action);
    });

    transport.readyToPlay(canvasId);
};

