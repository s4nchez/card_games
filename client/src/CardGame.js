var CardGame = CardGame || {};

CardGame.CollisionDetection = function(){
    var detector = {}, currentCollision, checkCollisionBetween, handleCollision, handleNonCollision;

    handleCollision = function(gameComponent, currentComponent){
        if (currentComponent !== currentCollision) {
            if (currentCollision) {
                currentCollision.onCollisionStop(gameComponent.getModel());
            }
            currentCollision = currentComponent;
            currentCollision.onCollisionStart(gameComponent.getModel());
        }
    };

    handleNonCollision = function(gameComponent, currentComponent){
        if (currentCollision && currentCollision === currentComponent) {
            currentCollision.onCollisionStop(gameComponent.getModel());
            currentCollision = null;
        }
    };

    checkCollisionBetween = function(gameComponent, currentComponent) {
        var c1, c2;
        if (currentComponent === gameComponent) {
            return false;
        }
        c1 = gameComponent.getPoints();
        c2 = currentComponent.getPoints();
        if (c1.top >= c2.top && c1.top <= c2.bottom &&
            c1.left >= c2.left && c1.left <= c2.right) {
            handleCollision(gameComponent, currentComponent);
            return true;
        }
        handleNonCollision(gameComponent, currentComponent);
        return false;
    };

    detector.detectCollision = function(gameComponent, components){
        var i;
        for(i = 0; i < components.length; i++){
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
        groupStyle = availableTypes.stack,
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
        return cards.indexOf(card) !== -1;
    };
    group.getWidth = function(){
        return config.borderOffset * 2 + config.cardWidth + calculateCardX(cards.length - 1);
    };
    group.getHeight = function(){
        return config.borderOffset * 2 + config.cardHeight + calculateCardY(cards.length - 1);
    };
    group.getCards = function(){
        var i, len = cards.length,
            result = [];
        for(i = 0; i < len; i++){
            result.push({
                cardId: cards[i],
                x: x + config.borderOffset + calculateCardX(i),
                relativeX: config.borderOffset + calculateCardX(i),
                y: y + config.borderOffset + calculateCardY(i),
                relativeY: config.borderOffset + calculateCardY(i)
            });
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
    group.getX = function(){return x;};
    group.getY = function(){return y;};
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
            var gIndex, len = groups.length;
            for(gIndex = 0; gIndex < len; gIndex++){
                if(groups[gIndex].groupId === groupId){
                    return groups[gIndex];
                }
            }
            console.error("Group not found: " + groupId);
        },
        findGroupContainingCard = function(cardId){
            var gIndex, len = groups.length;
            for(gIndex = 0; gIndex < len; gIndex++){
                if(groups[gIndex].contains(cardId)){
                    return groups[gIndex];
                }
            }
            console.error("Group not found for card "+cardId);
        },
        addGroup = function (x, y, optionalGroupId) {
            var groupId = optionalGroupId, group;
            if (!groupId) {
                groupCounter += 1;
                groupId = "group_" + groupCounter;
            }
            group = CardGame.Group(groupId, x, y, {
                borderOffset:20,
                cardHeight:96,
                cardWidth:72,
                cardFaceWidth:15,
                cardFaceHeight:30
            });
            groups.push(group);
            game.trigger("GroupCreated", group, x, y);
            game.selectGroup(groupId);
            return group;
        };

    _.extend(game, Backbone.Events);

    transport.on("InitialState", function(groups){
        var i, j, groupDetails, group;
        for(i = 0; i < groups.length; i++) {
            groupDetails = groups[i];
            group = addGroup(groupDetails.x, groupDetails.y, groupDetails.group_id);
            group.groupStyle(groupDetails.style);

            for(j = 0; j < groupDetails.cards.length; j++){
                group.addCard(groupDetails.cards[j]);
            }
        }
    });

    transport.on("group_repositioned", function(details){
        findGroup(details.group_id).moveTo(details.x, details.y);
        game.trigger("GroupRepositioned:" + details.group_id);
    });

    transport.on("group_restyled", function(details){
        findGroup(details.group_id).groupStyle(details.style_name);
    });

    game.groupMovedByWidget = function(groupId, newX, newY) {
        transport.sendCommand("reposition_group", [groupId, newX, newY]);
        findGroup(groupId).moveTo(newX, newY);
    };

    game.selectGroup = function(groupId){
        var group = findGroup(groupId);
        if(selectedGroup){
            selectedGroup.unselected();
        }
        group.selected();
        selectedGroup = group;
    };

    game.startMoving = function(card) {
        var group = findGroupContainingCard(card.cardId);
        group.removeCard(card.cardId);
        card.moveStartGroupId = group.groupId;
        if (group.size() === 0) {
            game.trigger("GroupRemoved", group.groupId);
        }
    };

    game.droppedOut = function(card, x, y) {
        var cardId = card.cardId,
            newGroup = addGroup(x, y),
            oldGroupId = newGroup.groupId;

        newGroup.addCard(cardId);

        console.debug("Dropped <%s> at (%s, %s) from group <%s>", cardId, x, y, card.moveStartGroupId);

        transport.createGroup(card.moveStartGroupId, newGroup, cardId, [x, y], function(newGroupId) {
            // update ui widget and group model
            game.trigger("GroupIdChanged", oldGroupId, newGroupId);
            newGroup.groupId = newGroupId;
        });
    };

    game.receiveCard = function(draggedId, droppedOnId) {
        var group = findGroup(droppedOnId);
        group.addCard(draggedId);
        game.selectGroup(droppedOnId);
    };

    game.cardReceivedCard = function(draggedCardId, droppedOnCardId){
        var group = findGroupContainingCard(droppedOnCardId);
        group.addCard(draggedCardId, droppedOnCardId);
        game.selectGroup(group.groupId);
    };

    game.changeStyleOfSelectGroup = function(styleName){
        console.log("restyle_group");
        transport.sendCommand("restyle_group", [selectedGroup.groupId, styleName]);
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
        var i, component, len = components.length;
        for(i = 0; i < len; i++){
            component = components[i];
            if(component.getModel().groupId && component.getModel().groupId === groupId){
                remove(component);
                break;
            }
        }
    });

    ui.on("GroupIdChanged", function(oldGroupId, newGroupId){
        var i, component, len = components.length;
        for(i = 0; i < len; i++){
            component = components[i];
            if(component.getModel().groupId && component.getModel().groupId === oldGroupId){
                component.groupId = newGroupId;
                break;
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
    var group = {groupId: options.groupId},
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
            var cardId, len = cards.length;
            for(cardId = 0; cardId < len; cardId++){
                cards[cardId].getComponent().setAlpha(0);
            }
        },
        redrawInternals = function(){
            var i, uiCards = groupUI.getCards(),
                len = uiCards.length,
                cardPosition, cardComponent;
            groupComponent.setX(groupUI.getX());
            groupComponent.setY(groupUI.getY());
            border.setWidth(groupUI.getWidth());
            border.setHeight(groupUI.getHeight());
            mirror.clear();
            for(i = 0; i < len; i++){
                cardPosition = uiCards[i];
                mirror.addCard(cardPosition.cardId, cardPosition.relativeX, cardPosition.relativeY);
                cardComponent = cards[cardPosition.cardId].getComponent();
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
                }());
            };

            mirror.clear = function(){
                var i;
                for(i = 0; i < cardImages.length;i++){
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
            ui.receiveCard(model.cardId, group.groupId);
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
    ui.on("GroupRepositioned:" + group.groupId, redrawInternals);

    groupComponent.on("click", function(){
        ui.selectGroup(group.groupId);
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
        return { groupId: group.groupId };
    };

    (function(){
        groupComponent.on("dragstart", hideCardComponents);
        groupComponent.on("dragend", function(){
            var pos = border.getAbsolutePosition();
            ui.groupMovedByWidget(group.groupId, pos.x, pos.y);
            redrawInternals();
        });
    }());

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
    card.cardId = cardId;

    imageObj.onload = function() {
        image.setImage(imageObj);
        stage.draw();
    };

    imageObj.src = "images/classic-cards/"+cardId+".png";

    image.on("dragstart", function(){
        ui.startMoving(card);
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
        ui.droppedOut(card, image.getX(), image.getY());
        return true;
    };

    CardGame.CollisionableWidget(stage, card);

    stage.add(card);

    return card;
};

CardGame.PollingTransport = function(){
    var transport = {},
    handleNextMessages = function(messageWrapper){
        var index, messages = messageWrapper.messages,
            len = messages.length;
        for(index = 0; index < len; index++){
            console.log('PollingTransport: received '+JSON.stringify(messages[index]));
            transport.trigger(messages[index].message_type, messages[index].details);
        }
    };

    _.extend(transport, Backbone.Events);

    jQuery.getJSON("/current-state", function(groups){
        transport.trigger("InitialState", groups);
    });

    setInterval(function(){
        jQuery.getJSON("/query", handleNextMessages);
    },1000);

    transport.sendCommand = function(command, details) {
        jQuery.getJSON("/command/" + command, {details: details.join(",")}, function(data){
            console.log("command result:"+ data.result);
        });
    };

    transport.createGroup = function(sourceGroupId, targetGroup, cardId, cardPosition, newGroupIdFunction) {
        // how to set player?
        console.debug("transport.createGroup(%s, %s, %s, %o)", sourceGroupId, targetGroup.groupId, cardId,
            cardPosition);

        var params = {
            "sourceGroupId": sourceGroupId,
            "cardId": cardId,
            "cardPosition": cardPosition
        };
        jQuery.post("/command/group", params, function(data, textStatus) {
            console.debug("createGroup received response <%o, %o>", data, textStatus);
            if (newGroupIdFunction) {
                newGroupIdFunction(data.newGroupId);
            }
        }, "json");
    };

    return transport;
};
