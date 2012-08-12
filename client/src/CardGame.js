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

CardGame.Group = function(initialGroupId, initialX, initialY, config){
    var groupId = initialGroupId, previousGroupId, group = {},
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
    group.indexOf = function(card){
        return cards.indexOf(card);
    };
    group.getWidth = function(){
        return config.borderOffset * 2 + config.cardWidth + calculateCardX(cards.length - 1);
    };
    group.updateId = function(newGroupId){
        previousGroupId = groupId;
        groupId = newGroupId;
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
        var idx = 0;
        if(insertAfterCardId){
            idx = cards.indexOf(insertAfterCardId) + 1;
        }
        return group.addCardOnPosition(cardId, idx);
    };
    group.addCardOnPosition = function(cardId, idx){
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
    group.getGroupId = function(){
        return groupId;
    };
    group.getPreviousGroupId = function(){
        return previousGroupId;
    };
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
                if (group.getGroupId() === groupId) {
                    foundGroup = group;
                    return true;
                }
            });
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
        },
        removeGroup = function(group) {
            var ix = groups.indexOf(group);
            groups.splice(ix, 1);
        };

    _.extend(game, Backbone.Events);

    transport.on("InitialState", function(groups){
        groups.forEach(function (groupDetails) {
            var group = addGroup(groupDetails.x, groupDetails.y, groupDetails.group_id);
            group.groupStyle(groupDetails.style);
            for(j = groupDetails.cards.length -1; j >= 0; j--){
                group.addCard(groupDetails.cards[j]);
                game.trigger("CardCreatedAndAddedToGroup", group.getGroupId(), groupDetails.cards[j]);
            }
        });
    });

    transport.on("group_repositioned", function(details){
        findGroup(details.group_id).moveTo(details.x, details.y);
        game.trigger("GroupRepositioned:" + details.group_id);
    });

    transport.on("group_restyled", function(details){
        findGroup(details.group_id).groupStyle(details.style_name);
    });

    transport.on("group_created", function(details, isActor){
        var sourceGroup, targetGroup, cardId = details.card,
            card = { cardId:cardId }, targetGroupInitialId;
        sourceGroup = findGroup(details.source_group_old_id);
        if(isActor){
            targetGroup = findGroupContainingCard(cardId);
            targetGroupInitialId = targetGroup.getGroupId();
            targetGroup.updateId(details.target_group_new_id);
            game.trigger("GroupIdChanged", targetGroupInitialId, details.target_group_new_id);
            game.trigger("GroupUnlocked", targetGroup.getGroupId());
        }else{
            game.startMoving(card);
            targetGroup = addGroup(details.x, details.y, details.target_group_new_id);
            targetGroup.addCard(cardId);
            game.trigger("CardAddedToGroup", targetGroup.getGroupId(), cardId);
        }

        if (sourceGroup) {
            sourceGroup.updateId(details.source_group_new_id);
            game.trigger("GroupIdChanged", details.source_group_old_id, details.source_group_new_id);
            game.trigger("GroupUnlocked", details.source_group_new_id);
        }
    });

    transport.on("card_moved", function(details, isActor){
        var sourceGroup, targetGroup, cardId = details.card,
            targetIndex = details.target_card_idx,
            card = { cardId:cardId };
        sourceGroup = findGroup(details.source_group_old_id);
        targetGroup = findGroup(details.target_group_old_id);

        if(!isActor){
            game.startMoving(card);
            targetGroup.addCardOnPosition(cardId, targetIndex);
            game.trigger("CardAddedToGroup", targetGroup.getGroupId(), cardId);
        }

        if(sourceGroup) {
            sourceGroup.updateId(details.source_group_new_id);
            game.trigger("GroupIdChanged", details.source_group_old_id, details.source_group_new_id);
        }

        if(details.source_group_old_id !== details.target_group_old_id){
            targetGroup.updateId(details.target_group_new_id);
            game.trigger("GroupIdChanged", details.target_group_old_id, details.target_group_new_id);
        }
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
        card.moveStartGroupId = group.getGroupId();
        card.moveStartCardIdx = group.indexOf(card.cardId);
        group.removeCard(card.cardId);
        if (group.size() === 0) {
            console.log('GroupRemoved '+group.getGroupId());
            removeGroup(group);
            game.trigger("GroupRemoved", group.getGroupId());
        }else{
            game.trigger("GroupLocked", group.getGroupId());
            game.trigger("CardRemovedFromGroup", group.getGroupId(), card.cardId);
        }
    };

    game.droppedOut = function(card, x, y) {
        var cardId = card.cardId,
            newGroup = addGroup(x, y);

        newGroup.addCard(cardId);

        game.trigger("CardAddedToGroup", newGroup.getGroupId(), cardId);

        game.trigger("GroupLocked", newGroup.getGroupId());

        transport.createGroup(card.moveStartGroupId, card.moveStartCardIdx, [x, y]);
    };

    game.receiveCard = function(draggedCard, droppedOnGroupId) {
        var group = findGroup(droppedOnGroupId),
            cardIdx = group.addCard(draggedCard.cardId);
        game.trigger("CardAddedToGroup", group.getGroupId(), draggedCard.cardId);
        game.selectGroup(droppedOnGroupId);

        // TODO function to call back if something went wrong?
        transport.moveCard(draggedCard.moveStartGroupId, draggedCard.moveStartCardIdx, droppedOnGroupId, cardIdx);
    };

    game.cardReceivedCard = function(draggedCard, droppedOnCardId){
        var group = findGroupContainingCard(droppedOnCardId),
            cardIdx = group.addCard(draggedCard.cardId, droppedOnCardId);
        game.trigger("CardAddedToGroup", group.getGroupId(), draggedCard.cardId);
        game.selectGroup(group.getGroupId());

        // TODO function to call back if something went wrong?
        transport.moveCard(draggedCard.moveStartGroupId, draggedCard.moveStartCardIdx, group.getGroupId(), cardIdx);
    };

    game.changeStyleOfSelectGroup = function(styleName){
        console.log("restyle_group");
        transport.sendCommand("restyle_group", [selectedGroup.getGroupId(), styleName]);
        selectedGroup.groupStyle(styleName);
    };

    game.init = function(){
        transport.init();
    };

    return game;
};

CardGame.Assets = function(){
    var assets = {}, imageObj,
        cards = ["AS", "AC", "AD", "AH", "KS", "KC", "KD", "KH", "QS", "QC", "QD", "QH", "JS", "JC", "JD", "JH"],
        imageDimensions = {width: 72, height: 96},
        calculateCardSprites = function(){
            var i, result = {};
            for(i =0; i < cards.length; i++){
                result[cards[i]] = {
                    x: i * imageDimensions.width,
                    y: 0,
                    width: imageDimensions.width,
                    height: imageDimensions.height
                };
            }
            return result;
        }, spriteSpecs;

    assets.load = function(callback){
        spriteSpecs = calculateCardSprites();
        imageObj = new Image();
        imageObj.onload = function(){
            callback();
        };
        imageObj.src = "images/classic-cards/all.png";
    };
    assets.getCardSprite = function(cardId, draggable){
        if(!draggable){
            draggable = false;
        }
        var sprite = new Kinetic.Sprite({
            x:0,
            y:0,
            image:imageObj,
            animation:'idle',
            animations:{ idle: [spriteSpecs[cardId]] },
            frameRate:1,
            draggable:draggable
        });
        sprite.getWidth = function(){return imageDimensions.width;};
        sprite.getHeight = function(){return imageDimensions.height;};
        return sprite;
    };
    return assets;
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
            var group = groups[groupId];
            if(!group){
                console.error('bang!');
            }
            group.redraw();
            components.sort(byZIndex);
        },
        assets = CardGame.Assets();

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

    ui.on("GroupCreated", function(group, x, y){
        groups[group.getGroupId()] = CardGame.GroupWidget(stage, ui, group, {
            x: x,
            y: y
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
            if(component.getModel().previousGroupId && component.getModel().previousGroupId === oldGroupId){
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

    ui.on("GroupLocked", function(groupId) {
        console.log("GroupLocked: %s", groupId);
        groups[groupId].lock();
    });

    ui.on("GroupUnlocked", function(groupId) {
        console.log("GroupUnlocked: %s", groupId);
        groups[groupId].unlock();
    });

    stage.getCardWidget = function(cardId){
        return cards[cardId];
    };

    stage.getCardSprite = assets.getCardSprite;

    internalStage.add(layer);

    assets.load(function(){
        ui.init();
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
    var group = {},
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
            groupComponent.setX(groupUI.getX());
            groupComponent.setY(groupUI.getY());
            border.setWidth(groupUI.getWidth());
            border.setHeight(groupUI.getHeight());
            mirror.clear();
            applyToCards(function(cardPosition, cardWidget) {
                var cardComponent = cardWidget.getComponent();
                mirror.addCard(cardPosition.cardId, cardPosition.relativeX, cardPosition.relativeY);
                cardComponent.setAlpha(1);
                cardComponent.setX(cardPosition.x);
                cardComponent.setY(cardPosition.y);
                cardComponent.moveToTop();
            });
        },
        cardsMirroring = function(groupComponent){
            var mirror = {}, cardImages = [];

            mirror.addCard = function (card, x, y) {
                var image = stage.getCardSprite(card);
                image.setX(x);
                image.setY(y);
                cardImages.push(image);
                        groupComponent.add(image);
                        stage.draw();
            };

            mirror.clear = function(){
                cardImages.forEach(function(cardImage){
                    groupComponent.remove(cardImage);
                });
                cardImages = [];
            };

            return mirror;
        },
        mirror = cardsMirroring(groupComponent),
        applyToCards = function(callback) {
            var uiCards = groupUI.getCards();
            uiCards.forEach(function(card) {
                callback(card, stage.getCardWidget(card.cardId));
            });
        };

    groupComponent.add(border);

    group.getComponent = function(){
        return groupComponent;
    };

    group.lock = function() {
        groupComponent.setDraggable(false);
        applyToCards(function(card, widget){
            widget.lock();
        });
    };

    group.unlock = function() {
        groupComponent.setDraggable(true);
        applyToCards(function(card, widget){
            widget.unlock();
        });
    };

    group.onCollisionStart = function(model){
        hideCardComponents();
    };

    group.onCollisionStop = function(model){
        redrawInternals();
    };

    group.onCollisionAccepted = function(model){
        if(model.cardId){
            ui.receiveCard(model, groupUI.getGroupId());
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
        ui.selectGroup(groupUI.getGroupId());
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
        return { groupId: groupUI.getGroupId(), previousGroupId: groupUI.getPreviousGroupId() };
    };

    (function(){
        groupComponent.on("dragstart", hideCardComponents);
        groupComponent.on("dragend", function(){
            var pos = border.getAbsolutePosition();
            ui.groupMovedByWidget(groupUI.getGroupId(), pos.x, pos.y);
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
        image = stage.getCardSprite(options.cardId, true);

    card.cardId = cardId;

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
        model.moveStartCardIdx = card.moveStartCardIdx;
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

    card.lock = function() {
        image.setDraggable(false);
    };

    card.unlock = function() {
        image.setDraggable(true);
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
    image.start();

    return card;
};

CardGame.PollingTransport = function(){
    var transport = {},
        player,
        handleNextMessages = function(messageWrapper){
            var messages = messageWrapper.messages;
            messages.forEach(function(message){
                console.log('PollingTransport: received '+JSON.stringify(message));
                if(message.message_type === "invalid_command"){
                    console.error("Received error message: "+JSON.stringify(message.details));
                }
                console.log("Is actor? %s", message.actor === player);
                transport.trigger(message.message_type, message.details, message.actor === player);
            });
        };

    _.extend(transport, Backbone.Events);

    transport.init = function(){
        jQuery.getJSON("/current-state", function(data){
            player = data.player;
            transport.trigger("InitialState", data.current_state);
        });
    };

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

    transport.createGroup = function(sourceGroupId, cardIdx, cardPosition) {
        console.debug("create_group (%s, %s, %o)", sourceGroupId, cardIdx, cardPosition);
        var params = {
            "source_group_id": sourceGroupId,
            "card_idx": cardIdx,
            "position": cardPosition
        };
        jQuery.post("/command/group", params, function(data, textStatus) {
            console.log("command result: "+data.result);
        }, "json");
    };

    transport.moveCard = function(sourceGroupId, sourceCardIdx, targetGroupId, targetCardIdx) {
        // how to set player?
        console.debug("transport.moveCard(%s, %s, %s, %s)", sourceGroupId, sourceCardIdx, targetGroupId, targetCardIdx);

        var params = {
            "source_group_id": sourceGroupId,
            "source_group_card_idx": sourceCardIdx,
            "target_group_id": targetGroupId,
            "target_group_card_idx": targetCardIdx
        };
        // TODO think about doing a PUT on a card instead?
        jQuery.post("/command/movecard", params, function(data, textStatus) {
            console.debug("moveCard received response <%o, %o>", data, textStatus);
        }, "json");
    };

    return transport;
};
