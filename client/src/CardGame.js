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
        components.some(function(component) {
            return checkCollisionBetween(gameComponent, component);
        });
    };

    detector.notifyCurrentCollision = function(gameComponent){
        if (currentCollision) {
            currentCollision.onCollisionAccepted(gameComponent.getModel());
        } else {
            gameComponent.onNoCollisionFound();
        }
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
        },
        createCard = function(card, i){
            return {
                cardId: cards[i],
                x: x + config.borderOffset + calculateCardX(i),
                relativeX: config.borderOffset + calculateCardX(i),
                y: y + config.borderOffset + calculateCardY(i),
                relativeY: config.borderOffset + calculateCardY(i)
            };
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
        return cards.map(createCard);
    };
    group.moveTo = function(newX, newY){
        x = newX;
        y = newY;
    };
    group.addCard = function(cardId, insertAfterCardId){
        // the uppermost card is at the end!  this is the default placement position (if we change this here,
        // we need to make sure the initialization code is consistent still)
        var idx = cards.length;
        if(insertAfterCardId){
            idx = cards.indexOf(insertAfterCardId) + 1;
        }
        cards.splice(idx, 0, cardId);
        return idx;
    };
    group.removeCard = function(card){
        var index = cards.indexOf(card);
        cards.splice(index, 1);
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
        findGroup = function (groupId) {
            var foundGroup = null;
            groups.some(function (group) {
                if (group.groupId === groupId) {
                    foundGroup = group;
                    return true;
                }
            });
            if (!foundGroup) {
                console.error("Group not found: " + groupId);
            }
            return foundGroup;
        },
        findGroupContainingCard = function (cardId) {
            var foundGroup = null;
            groups.some(function (group) {
                if (group.contains(cardId)) {
                    foundGroup = group;
                    return true;
                }
            });
            if (!foundGroup) {
                console.error("Group not found for card " + cardId);
            }
            return foundGroup;
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
        groups.forEach(function (groupDetails) {
            var group = addGroup(groupDetails.x, groupDetails.y, groupDetails.group_id);
            group.groupStyle(groupDetails.style);

            groupDetails.cards.forEach(function (card) {
                group.addCard(card);
                game.trigger("CardCreatedAndAddedToGroup", group.groupId, card);
            });
        });
    });

    transport.on("group_repositioned", function(details){
        findGroup(details.group_id).moveTo(details.x, details.y);
        game.trigger("GroupRepositioned:" + details.group_id);
    });

    transport.on("group_restyled", function(details){
        findGroup(details.group_id).groupStyle(details.style_name);
    });

    transport.on("group_created", function(details){
        var newGroup, cardId = details.cards[0],
            card = { cardId:cardId };
        game.startMoving(card);
        newGroup = addGroup(details.x, details.y, details.group_id);
        newGroup.addCard(cardId);
        game.trigger("CardAddedToGroup", newGroup.groupId, cardId);
    });

    transport.on("card_moved", function(details){
        console.log("handling card_moved");
        var sourceGroupId = details.source_group_id,
            targetGroupId = details.target_group_id,
            targetIndex = details.target_idx,
            cardId = details.card_id,
            card = { cardId:cardId };
        game.startMoving(card);
        game.receiveCard(card, targetGroupId);
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
            console.log('GroupRemoved '+group.groupId);
            game.trigger("GroupRemoved", group.groupId);
        }else{
            game.trigger("CardRemovedFromGroup", group.groupId, card.cardId);
        }
    };

    game.droppedOut = function(card, x, y) {
        var cardId = card.cardId,
            newGroup = addGroup(x, y),
            oldGroupId = newGroup.groupId;

        newGroup.addCard(cardId);

        game.trigger("CardAddedToGroup", newGroup.groupId, cardId);

        console.debug("Dropped <%s> at (%s, %s) from group <%s>", cardId, x, y, card.moveStartGroupId);

        transport.createGroup(card.moveStartGroupId, newGroup, cardId, [x, y], function(newGroupId) {
            // update ui widget and group model
            game.trigger("GroupIdChanged", oldGroupId, newGroupId);
            newGroup.groupId = newGroupId;
        });
    };

    game.receiveCard = function(draggedCard, droppedOnGroupId) {
        var group = findGroup(droppedOnGroupId),
            cardIdx = group.addCard(draggedCard.cardId);
        game.trigger("CardAddedToGroup", group.groupId, draggedCard.cardId);
        game.selectGroup(droppedOnGroupId);

        // TODO function to call back if something went wrong?
        transport.moveCard(draggedCard.moveStartGroupId, droppedOnGroupId, cardIdx, draggedCard.cardId);
    };

    game.cardReceivedCard = function(draggedCard, droppedOnCardId){
        var group = findGroupContainingCard(droppedOnCardId),
            cardIdx = group.addCard(draggedCard.cardId, droppedOnCardId);
        game.trigger("CardAddedToGroup", group.groupId, draggedCard.cardId);
        game.selectGroup(group.groupId);

        // TODO function to call back if something went wrong?
        transport.moveCard(draggedCard.moveStartGroupId, group.groupId, cardIdx, draggedCard.cardId);
    };

    game.changeStyleOfSelectGroup = function(styleName){
        console.log("restyle_group");
        transport.sendCommand("restyle_group", [selectedGroup.groupId, styleName]);
        selectedGroup.groupStyle(styleName);
    };

    return game;
};

CardGame.Stage = function(ui, options){
    var stage = {}, groups = {}, cards = {}, layer = new Kinetic.Layer(),
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
        },
        redrawGroupAndReorderComponents = function(groupId){
            groups[groupId].redraw();
            components.sort(byZIndex);
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
        collisionDetection.notifyCurrentCollision(gameComponent);
    };

    internalStage.add(layer);

    ui.on("GroupCreated", function(group, x, y){
        groups[group.groupId] = CardGame.GroupWidget(stage, ui, group, {
            x: x,
            y: y,
            groupId: group.groupId
        });
    });

    ui.on("GroupRemoved", function(groupId){
        components.some(function(component){
            if(component.getModel().groupId && component.getModel().groupId === groupId){
                remove(component);
                return true;
            }
        });
        delete groups[groupId];
    });

    ui.on("GroupIdChanged", function(oldGroupId, newGroupId){
        components.some(function(component){
            if(component.getModel().groupId && component.getModel().groupId === oldGroupId){
                component.groupId = newGroupId;
                return true;
            }
        });
        groups[newGroupId] = groups[oldGroupId];
        delete groups[oldGroupId];
    });

    ui.on("CardCreatedAndAddedToGroup", function(groupId, cardId){
        cards[cardId] = CardGame.CardWidget(stage, ui, {
            cardId:cardId
        });
        redrawGroupAndReorderComponents(groupId);
    });

    ui.on("CardRemovedFromGroup", function(groupId, cardId){
        redrawGroupAndReorderComponents(groupId);
    });

    ui.on("CardAddedToGroup", function(groupId, cardId){
        redrawGroupAndReorderComponents(groupId);
    });

    stage.getCardWidget = function(cardId){
        return cards[cardId];
    };

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
            groupUI.getCards().forEach(function (card) {
                stage.getCardWidget(card.cardId).getComponent().setAlpha(0);
            });
        },
        redrawInternals = function(){
            var uiCards = groupUI.getCards();
            groupComponent.setX(groupUI.getX());
            groupComponent.setY(groupUI.getY());
            border.setWidth(groupUI.getWidth());
            border.setHeight(groupUI.getHeight());
            mirror.clear();
            uiCards.forEach(function(cardPosition){
                mirror.addCard(cardPosition.cardId, cardPosition.relativeX, cardPosition.relativeY);
                var cardComponent = stage.getCardWidget(cardPosition.cardId).getComponent();
                cardComponent.setAlpha(1);
                cardComponent.setX(cardPosition.x);
                cardComponent.setY(cardPosition.y);
                cardComponent.moveToTop();
            });
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
                cardImages.forEach(function(cardImage){
                    groupComponent.remove(cardImage);
                });
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
            ui.receiveCard(model, group.groupId);
        }
    };

    group.onNoCollisionFound = function(){
    };

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

    group.redraw = redrawInternals;
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
        var model = { cardId: cardId };
        if (card.moveStartGroupId) {
            model.moveStartGroupId = card.moveStartGroupId;
        }
        return model;
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
        ui.cardReceivedCard(model, cardId);
    };

    card.onNoCollisionFound = function(){
        ui.droppedOut(card, image.getX(), image.getY());
    };

    CardGame.CollisionableWidget(stage, card);

    stage.add(card);

    return card;
};

CardGame.PollingTransport = function(){
    var transport = {},
    handleNextMessages = function(messageWrapper){
        var messages = messageWrapper.messages;
        messages.forEach(function(message){
            console.log('PollingTransport: received '+JSON.stringify(message));
            if(message.message_type === "invalid_command"){
                console.error("Received error message: "+JSON.stringify(message.details));
            }
            transport.trigger(message.message_type, message.details);
        });
    };

    _.extend(transport, Backbone.Events);

    jQuery.getJSON("/current-state", function(groups){
        transport.trigger("InitialState", groups);
    });

    setInterval(function(){
        try{
            jQuery.getJSON("/query", handleNextMessages);
        }catch(error){
            console.warn("keeping poller alive after error");
        }

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

    transport.moveCard = function(sourceGroupId, targetGroupId, targetIdx, cardId) {
        // how to set player?
        console.debug("transport.moveCard(%s, %s, %s, %o)", sourceGroupId, targetGroupId, targetIdx, cardId);

        var params = {
            "sourceGroupId": sourceGroupId,
            "targetGroupId": targetGroupId,
            "targetIdx": targetIdx,
            "cardId": cardId
        };
        // TODO think about doing a PUT on a card instead?
        jQuery.post("/command/movecard", params, function(data, textStatus) {
            console.debug("moveCard received response <%o, %o>", data, textStatus);
        }, "json");
    };

    return transport;
};
