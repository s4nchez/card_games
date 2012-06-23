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
                break
            }
        }
    };

    detector.notifyCurrentCollision = function(gameComponent){
        if(currentCollision){
            return currentCollision.onCollisionAccepted(gameComponent.getModel());
        }
        return false;
    };

    return detector;
};

CardGame.GameUI = function(){
    var game = {},
        cards = [],
        groupCounter = -1;

    _.extend(game, Backbone.Events);

    var addCard = function(id, groupId) {
        game.trigger("CardAdded:" + groupId, id);
        cards.push({
            id: id,
            groupId: groupId
        });
    };

    var addGroup = function() {
        groupCounter += 1;
        var groupId = "group_" + groupCounter;
        game.trigger("GroupCreated", groupId);
        return groupId;
    };

    game.init = function(ids){
        var groupId = addGroup();
        for(var i in ids){
            addCard(ids[i], groupId);
        }
    };

    game.startMoving = function(id) {
        var groupId;
        for(var i in cards) {
            if(cards[i].id === id) {
                groupId = cards[i].groupId;
                cards[i].groupId = undefined;
            }
        }
        game.trigger("CardRemoved:" + groupId, id);
    };

    game.droppedOut = function(id) {
        var groupId = addGroup();
        addCard(id, groupId);
    };

    game.receiveCard = function(draggedId, droppedOnId) {
        var groupId;
        for(var i in cards) {
            if(cards[i].id === droppedOnId) {
                groupId = cards[i].groupId;
            }
        }
        for(var i in cards) {
            if(cards[i].id === draggedId) {
                cards[i].groupId = groupId;
            }
        }
        game.trigger("CardAdded:" + groupId, draggedId);
    };

    return game;
};
