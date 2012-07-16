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

CardGame.GroupComponent = function(groupId, initialX, initialY, config){
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

CardGame.GameUI = function(){
    var game = {},
        groups = [],
        groupCounter = -1,
        selectedGroup;

    _.extend(game, Backbone.Events);

    var addGroup = function(x, y, optionalGroupId) {
        var groupId = optionalGroupId;
        if(!groupId){
            groupCounter += 1;
            groupId = "group_" + groupCounter;
        }
        var group = CardGame.GroupComponent(groupId, x, y, {
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

    game.init = function(groups){
        for(var i = 0; i < groups.length; i++) {
            var grp = groups[i];
            var group = addGroup(grp["x"], grp["y"], grp["group_id"]);
            group.groupStyle(grp["style"]);

            for(var j = 0; j < grp["cards"].length; j++){
                group.addCard(grp["cards"][j]);
            }
        }
    };

    game.selectGroup = function(groupId){
        if(selectedGroup){
            selectedGroup.unselected();
        }
        for(var i in groups){
            if(groups[i].groupId === groupId){
                groups[i].selected();
                selectedGroup = groups[i];
                break;
            }
        }
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
        for(var i in groups) {
            if(groups[i].groupId === droppedOnId) {
                groups[i].addCard(draggedId);
                game.selectGroup(groups[i].groupId);
            }
        }
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
