var CardGame = CardGame || {};

CardGame.CollisionDetection = function(){
    var detector = {}, currentCollision, checkCollisionBetween, handleCollision, handleNonCollision;

    handleCollision = function(gameComponent, currentComponent){
        if (currentComponent !== currentCollision) {
            if (currentCollision != null) {
                currentCollision.onCollisionStop(gameComponent.getModel());
            }
            currentCollision = currentComponent;
            currentCollision.onCollisionStart(gameComponent.getModel());
        }
    };

    handleNonCollision = function(gameComponent, currentComponent){
        if (currentCollision && currentCollision == currentComponent) {
            currentCollision.onCollisionStop(gameComponent.getModel());
            currentCollision = null;
        }
    };

    checkCollisionBetween = function(gameComponent, currentComponent) {
        if (currentComponent === gameComponent) {
            return false;
        }
        var c1 = gameComponent.getPoints(), c2 = currentComponent.getPoints();
        if (c1.top >= c2.top && c1.top <= c2.bottom &&
            c1.left >= c2.left && c1.left <= c2.right) {
            handleCollision(gameComponent, currentComponent);
            return true;
        } else {
            handleNonCollision(gameComponent, currentComponent);
            return false;
        }
    };

    detector.detectCollision = function(gameComponent, components){
        for(var i = 0; i < components.length; i++){
            if(checkCollisionBetween(gameComponent, components[i])){
                break;
            }
        }
    };

    detector.notifyCurrentCollision = function(gameComponent){
        if(currentCollision){
            return currentCollision.onCollisionAccepted(gameComponent.getModel());
        }
        return gameComponent.onNoCollisionFound();
    };

    return detector;
};

CardGame.Group = function(groupId, initialX, initialY, config){
    var group = {},
        cards = [],
        availableTypes = {
            "side_by_side_horizontal":{deltaX:config.cardWidth, deltaY:0},
            "side_by_side_vertical":{deltaX:0, deltaY:config.cardHeight},
            "overlapped_horizontal":{deltaX:config.cardFaceWidth, deltaY:0},
            "overlapped_vertical":{deltaX:0, deltaY:config.cardFaceHeight},
            "stack":{deltaX:1, deltaY:1}
        },
        groupStyle = availableTypes["stack"],
        x = initialX,
        y = initialY,
        calculateCardX = function(cardIndex){
            return cardIndex * groupStyle.deltaX;
        },
        calculateCardY = function(cardIndex){
            return cardIndex * groupStyle.deltaY;
        };

    _.extend(group, Backbone.Events);

    group.contains = function(card){
        return cards.indexOf(card) != -1;
    };
    group.getWidth = function(){
        return config.borderOffset * 2 + config.cardWidth + calculateCardX(cards.length - 1);
    };
    group.getHeight = function(){
        return config.borderOffset * 2 + config.cardHeight + calculateCardY(cards.length - 1);
    };
    group.getCards = function(){
        var result = [];
        for(var i in cards){
            result.push({
                cardId: cards[i],
                x: x + config.borderOffset + calculateCardX(i),
                relativeX: config.borderOffset + calculateCardX(i),
                y: y + config.borderOffset + calculateCardY(i),
                relativeY: config.borderOffset + calculateCardY(i)
            })
        }
        return result;
    };
    group.moveTo = function(newX, newY){
        x = newX;
        y = newY;
    };
    group.addCard = function(cardId, insertAfterCardId){
        var idx = 0;
        if(insertAfterCardId){
            idx = cards.indexOf(insertAfterCardId) + 1;
        }
        cards.splice(idx, 0, cardId);
        group.trigger("CardAdded", cardId);
    };
    group.removeCard = function(card){
        var index = cards.indexOf(card);
        cards.splice(index, 1);
        group.trigger("CardRemoved", card);
    };
    group.size = function(){
        return cards.length;
    };
    group.groupId = groupId;
    group.groupStyle = function(groupStyleName) {
        groupStyle = availableTypes[groupStyleName];
        group.trigger("StyleChanged");
    };
    group.selected = function(){
        group.trigger("GroupSelected");
    };
    group.unselected = function(){
        group.trigger("GroupUnselected");
    };
    return group;
};

CardGame.Game = function(transport){
    var game = {},
        groups = [],
        groupCounter = -1,
        selectedGroup,
        findGroup = function(groupId){
            for(var gIndex in groups){
                if(groups[gIndex].groupId === groupId){
                    return groups[gIndex];
                }
            }
            console.error("Group not found: " + groupId);
        };

    _.extend(game, Backbone.Events);

    var addGroup = function(x, y, optionalGroupId) {
        var groupId = optionalGroupId;
        if(!groupId){
            groupCounter += 1;
            groupId = "group_" + groupCounter;
        }
        var group = CardGame.Group(groupId, x, y, {
            borderOffset:20,
            cardHeight:96,
            cardWidth:72,
            cardFaceWidth: 15,
            cardFaceHeight: 30
        });
        groups.push(group);
        game.trigger("GroupCreated", group, x, y);
        game.selectGroup(groupId);
        return group;
    };

    transport.on("InitialState", function(groups){
        for(var i = 0; i < groups.length; i++) {
            var grp = groups[i];
            var group = addGroup(grp["x"], grp["y"], grp["group_id"]);
            group.groupStyle(grp["style"]);

            for(var j = 0; j < grp["cards"].length; j++){
                group.addCard(grp["cards"][j]);
            }
        }
    });

    transport.on("group_repositioned", function(details){
        findGroup(details.group_id).moveTo(details.x, details.y);
        game.trigger("GroupRepositioned:"+details.group_id);
    });

    game.selectGroup = function(groupId){
        if(selectedGroup){
            selectedGroup.unselected();
        }
        var group = findGroup(groupId);
        group.selected();
        selectedGroup = group;
    };

    game.startMoving = function(id) {
        var groupId, groupHasCardsLeft = false;
        for(var i in groups) {
            if(groups[i].contains(id)) {
                groupId = groups[i].groupId;
                groups[i].removeCard(id);
                groupHasCardsLeft = groups[i].size() > 0;
            }
        }
        !groupHasCardsLeft && game.trigger("GroupRemoved", groupId);
    };

    game.droppedOut = function(id, x, y) {
        var group = addGroup(x, y);
        group.addCard(id);
    };

    game.receiveCard = function(draggedId, droppedOnId) {
        var group = findGroup(droppedOnId);
        group.addCard(draggedId);
        game.selectGroup(droppedOnId);
    };

    game.cardReceivedCard = function(draggedCardId, droppedOnCardId){
        for(var i in groups) {
            if(groups[i].contains(droppedOnCardId)) {
                groups[i].addCard(draggedCardId, droppedOnCardId);
                game.selectGroup(groups[i].groupId);
            }
        }
    };

    game.changeStyleOfSelectGroup = function(styleName){
        selectedGroup.groupStyle(styleName);
    };

    return game;
};

CardGame.Stage = function(ui, options){
    var stage = {}, layer = new Kinetic.Layer(),
        internalStage = new Kinetic.Stage(options),
        collisionDetection = CardGame.CollisionDetection(),
        components = [],
        byZIndex = function (a, b) {
            return b.getComponent().getZIndex() - a.getComponent().getZIndex();
        },
        remove = function(gameComponent){
            var ix = components.indexOf(gameComponent);
            components.splice(ix, 1);
            layer.remove(gameComponent.getComponent());
            layer.draw();
        };

    stage.draw = function(){
        layer.draw();
    };

    stage.add = function(gameComponent){
        layer.add(gameComponent.getComponent());
        components.push(gameComponent);
        components.sort(byZIndex);
    };

    stage.detectCollisions = function(gameComponent){
        collisionDetection.detectCollision(gameComponent, components);
    };

    stage.notifyCurrentCollision = function(gameComponent){
        var destroy = collisionDetection.notifyCurrentCollision(gameComponent);
        if(destroy){
            remove(gameComponent);
        }
    };

    internalStage.add(layer);

    ui.on("GroupCreated", function(group, x, y){
        CardGame.GroupWidget(stage, ui, group, {
            x: x,
            y: y,
            groupId: group.groupId
        });
    });

    ui.on("GroupRemoved", function(groupId){
        for(var i in components){
            var component = components[i];
            if(component.getModel().groupId && component.getModel().groupId === groupId){
                remove(component);
            }
        }
    });

    return stage;
};

CardGame.CollisionableWidget = function(stage, component){
    component.getComponent().on("dragmove", function(){
        stage.detectCollisions(component);
        component.getComponent().moveToTop();
    });
    component.getComponent().on("dragstart", function(){
        component.getComponent().moveToTop();
    });
    component.getComponent().on("dragend", function(){
        stage.notifyCurrentCollision(component);
    });
};

CardGame.GroupWidget = function(stage, ui, groupUI, options) {
    var groupId = options.groupId,
        group = {},
        cards = {},
        offset = 5,
        groupComponent = new Kinetic.Group({
            x: options.x,
            y: options.y,
            draggable: true
        }),
        border = new Kinetic.Rect({
            height: 106,
            fill: "#FFFFFF",
            stroke: "#CCCCCC",
            strokeWidth: 2
        }),
        hideCardComponents = function(){
            //hide card components
            for(var cardId in cards){
                cards[cardId].getComponent().setAlpha(0);
            }
        },
        redrawInternals = function(){
            var i = 0, uiCards = groupUI.getCards();
            border.setWidth(groupUI.getWidth());
            border.setHeight(groupUI.getHeight());
            mirror.clear();
            for (i in uiCards) {
                var cardPosition = uiCards[i];
                mirror.addCard(cardPosition.cardId, cardPosition.relativeX, cardPosition.relativeY);
                var cardComponent = cards[cardPosition.cardId].getComponent();
                cardComponent.setAlpha(1);
                cardComponent.setX(cardPosition.x);
                cardComponent.setY(cardPosition.y);
                cardComponent.moveToTop();
            }
        },
        cardsMirroring = function(groupComponent){
            var mirror = {}, cardImages = [];

            mirror.addCard = function (card, x, y) {
                var image = new Kinetic.Image({
                    x:x,
                    y:y,
                    alpha: 0.5,
                    width:72,
                    height:96
                });

                (function () {
                    var imageObj = new Image();
                    imageObj.onload = function () {
                        image.setImage(imageObj);
                        cardImages.push(image);
                        groupComponent.add(image);
                        stage.draw();
                    };
                    imageObj.src = "images/classic-cards/" + card + ".png";
                })();
            };

            mirror.clear = function(){
                for(var i = 0; i < cardImages.length;i++){
                    groupComponent.remove(cardImages[i]);
                }
                cardImages = [];
            };

            return mirror;
        },
        mirror = cardsMirroring(groupComponent);

    groupComponent.add(border);

    group.getComponent = function(){
        return groupComponent;
    };

    group.onCollisionStart = function(model){
        hideCardComponents();
    };

    group.onCollisionStop = function(model){
        redrawInternals();
    };

    group.onCollisionAccepted = function(model){
        if(model.cardId){
            ui.receiveCard(model.cardId, groupId);
            return true;
        }
        return false;
    };

    group.onNoCollisionFound = function(){
    };

    groupUI.on("CardAdded", function(cardId){
        cards[cardId] = CardGame.CardWidget(stage, ui, {
            cardId:cardId
        });
        redrawInternals();
    });

    groupUI.on("CardRemoved", function(cardId){
        delete cards[cardId];
        redrawInternals();
    });

    groupUI.on("GroupSelected", function(){
        border.setStroke("#00FF00");
    });

    groupUI.on("GroupUnselected", function(){
        border.setStroke("#CCCCCC");
    });

    groupUI.on("StyleChanged", redrawInternals);
    ui.on("GroupRepositioned:" + groupId, redrawInternals);

    groupComponent.on("click", function(){
        ui.selectGroup(groupId);
        stage.draw();
    });

    group.getPoints = function(){
        var pos = border.getAbsolutePosition();
        return {
            top:pos.y,
            left:pos.x,
            right:pos.x + border.getWidth(),
            bottom:pos.y + border.getHeight()
        };
    };

    group.getModel = function(){
        return { groupId: groupId };
    };

    (function(){
        groupComponent.on("dragstart", hideCardComponents);
        groupComponent.on("dragend", function(){
            var pos = border.getAbsolutePosition();
            groupUI.moveTo(pos.x, pos.y);
            redrawInternals();
        });
    })();

    stage.add(group);

    return group;
};

CardGame.CardWidget = function(stage, ui, options){
    var cardId = options.cardId,
        card = {},
        imageObj = new Image(),
        image = new Kinetic.Image({
            x: options.x,
            y: options.y,
            width: 72,
            height: 96,
            draggable: true
        });

    imageObj.onload = function() {
        image.setImage(imageObj);
        stage.draw();
    };

    imageObj.src = "images/classic-cards/"+cardId+".png";

    image.on("dragstart", function(){
        ui.startMoving(cardId);
    });

    card.getComponent = function(){
        return image;
    };

    card.getModel = function(){
        return { cardId: cardId };
    };

    card.getPoints = function () {
        return {
            top:image.getY(),
            left:image.getX(),
            right:image.getX() + image.getWidth(),
            bottom:image.getY() + image.getHeight()
        };
    };

    card.onCollisionStart = function () {
    };

    card.onCollisionStop = function () {
    };

    card.onCollisionAccepted = function(model){
        ui.cardReceivedCard(model.cardId, cardId);
        return true;
    };

    card.onNoCollisionFound = function(){
        ui.droppedOut(cardId, image.getX(), image.getY());
        return true;
    };

    CardGame.CollisionableWidget(stage, card);

    stage.add(card);

    return card;
};

CardGame.PollingTransport = function(){
    var transport = {},
        handleNextMessages = function(messageWrapper){
            var messages = messageWrapper.messages;
            for(var index in messages){
                console.log('PollingTransport: received '+JSON.stringify(messages[index]));
            }
        };

    _.extend(transport, Backbone.Events);

    jQuery.getJSON("/current-state", function(groups){
        transport.trigger("InitialState", groups);
    });

    setInterval(function(){
        jQuery.getJSON("/query", handleNextMessages);
    },1000);

    return transport;
};