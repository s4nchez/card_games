var CardGame = CardGame || {};

CardGame.CollisionDetection = function(){
    var detector = {}, currentCollision, checkCollisionBetween, handleCollision, handleNonCollision;

    handleCollision = function(gameComponent, currentComponent){
        if (currentComponent !== currentCollision) {
            if (currentCollision != null) {
                currentCollision.onCollisionStop(gameComponent.getModel());
            }
            currentCollision = currentComponent;
//                    console.log('collision started with '+JSON.stringify(currentCollision.getModel()));
            currentCollision.onCollisionStart(gameComponent.getModel());
        }
    };

    handleNonCollision = function(gameComponent, currentComponent){
        if (currentCollision && currentCollision == currentComponent) {
//                    console.log('collision stopped with '+JSON.stringify(currentCollision.getModel()));
            currentCollision.onCollisionStop(gameComponent.getModel());
            currentCollision = null;
        }
    };

    checkCollisionBetween = function(gameComponent, currentComponent) {
        if (currentComponent === gameComponent) {
            return false;
        }
        var c1 = gameComponent.getPoints(), c2 = currentComponent.getPoints();
        if (c1.bottom >= c2.top && c1.top <= c2.bottom &&
            c1.right >= c2.left && c1.left <= c2.right) {
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
    var group = {}, cards = [],
        x = initialX,
        y = initialY;

    _.extend(group, Backbone.Events);

    group.contains = function(card){
        return cards.indexOf(card) != -1;
    };
    group.getPoints = function(){
        return {
            top: y,
            left: x,
            right: x + config.borderOffset * 2 + ((cards.length -1) * config.cardFaceWidth) + config.cardWidth,
            bottom: y + + config.borderOffset * 2 + config.cardHeight
        }
    };
    group.moveTo = function(newX, newY){
        x = newX;
        y = newY;
    };
    group.addCard = function(cardId){
        cards.push(cardId);
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
    return group;
};

CardGame.GameUI = function(){
    var game = {},
        groups = [],
        groupCounter = -1;

    _.extend(game, Backbone.Events);

    var addGroup = function(x, y) {
        groupCounter += 1;
        var groupId = "group_" + groupCounter;
        var group = CardGame.GroupComponent(groupId, x, y, {});
        groups.push(group);
        game.trigger("GroupCreated", group, x, y);
        return group;
    };

    game.init = function(ids){
        var group = addGroup(10, 10);
        for(var i in ids){
            group.addCard(ids[i]);
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
            }
        }
    };

    return game;
};
