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

    createSet = function(elementId){
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
            elements[action.element_id] = createSet(action.element_id);
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

