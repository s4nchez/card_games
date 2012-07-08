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
        groupStyle = CardGame.GroupStack(),
        availableTypes = {
            "side_by_side_horizontal": CardGame.GroupSideBySideHorizontal(),
            "side_by_side_vertical": CardGame.GroupSideBySideVertical(),
            "overlapped_horizontal": CardGame.GroupOverlappedHorizontal(),
            "overlapped_vertical": CardGame.GroupOverlappedVertical(),
            "stack": CardGame.GroupStack(),
        },
        x = initialX,
        y = initialY;

    _.extend(group, Backbone.Events);

    group.contains = function(card){
        return cards.indexOf(card) != -1;
    };
    group.getWidth = function(){
        return config.borderOffset * 2 + groupStyle.getWidth(cards.length, config);
    };
    group.getHeight = function(){
        return config.borderOffset * 2 + groupStyle.getHeight(cards.length, config);
    }
    group.getCards = function(){
        var result = [];
        for(var i in cards){
            result.push({
                cardId: cards[i],
                x: x + config.borderOffset + groupStyle.getCardX(i, config),
                relativeX: config.borderOffset + groupStyle.getCardX(i, config),
                y: y + config.borderOffset + groupStyle.getCardY(i, config),
                relativeY: config.borderOffset + groupStyle.getCardY(i, config)
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

CardGame.GroupOverlappedHorizontal = function() {
    return {
        getWidth: function(numberOfCards, config) {
            return ((numberOfCards -1) * config.cardFaceWidth) + config.cardWidth;
        },
        getHeight: function(numberOfCards, config) {
            return config.cardHeight;
        },
        getCardX: function(i, config) {
            return i * config.cardFaceWidth;
        },
        getCardY: function(i, config) {
            return 0;
        }
   };
};

CardGame.GroupOverlappedVertical = function() {
    return {
        getWidth: function(numberOfCards, config) {
            return config.cardWidth;
        },
        getHeight: function(numberOfCards, config) {
            return ((numberOfCards -1) * config.cardFaceHeight) + config.cardHeight;
        },
        getCardX: function(i, config) {
            return 0;
        },
        getCardY: function(i, config) {
            return i * config.cardFaceHeight;
        }
    }
};

CardGame.GroupSideBySideHorizontal = function() {
    return {
        getWidth: function(numberOfCards, config) {
            return numberOfCards * config.cardWidth;
        },
        getHeight: function(numberOfCards, config) {
            return config.cardHeight;
        },
        getCardX: function(i, config) {
            return i * config.cardWidth;
        },
        getCardY: function(i, config) {
            return 0;
        }
    }
};

CardGame.GroupSideBySideVertical = function() {
    return {
        getWidth: function(numberOfCards, config) {
            return config.cardWidth;
        },
        getHeight: function(numberOfCards, config) {
            return numberOfCards * config.cardHeight;
        },
        getCardX: function(i, config) {
            return 0;
        },
        getCardY: function(i, config) {
            return i * config.cardHeight;
        }
    }
};

CardGame.GroupStack = function() {
    return {
        getWidth: function(numberOfCards, config) {
            return numberOfCards + config.cardWidth;
        },
        getHeight: function(numberOfCards, config) {
            return numberOfCards + config.cardHeight;
        },
        getCardX: function(i, config) {
            return i * 1;
        },
        getCardY: function(i, config) {
            return i * 1;
        }
    }
};

CardGame.GameUI = function(){
    var game = {},
        groups = [],
        groupCounter = -1,
        selectedGroup;

    _.extend(game, Backbone.Events);

    var addGroup = function(x, y) {
        groupCounter += 1;
        var groupId = "group_" + groupCounter;
        var group = CardGame.GroupComponent(groupId, x, y, {
            borderOffset:5,
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

    game.init = function(ids){
        var group = addGroup(10, 10);
        for(var i in ids){
            group.addCard(ids[i]);
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
    }

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
    }

    return game;
};
