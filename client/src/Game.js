/*global console, Backbone */
var CardGame = CardGame || {};

(function () {
    "use strict";

    CardGame.Game = function (transport) {
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
                    borderOffset: 20,
                    cardHeight: 96,
                    cardWidth: 72,
                    cardFaceWidth: 15,
                    cardFaceHeight: 30
                });
                groups.push(group);
                game.trigger("GroupCreated", group, x, y);
                game.selectGroup(groupId);
                return group;
            },
            removeGroup = function (group) {
                var ix = groups.indexOf(group);
                groups.splice(ix, 1);
            };

        _.extend(game, Backbone.Events);

        transport.on("InitialState", function (groups) {
            groups.forEach(function (groupDetails) {
                var group = addGroup(groupDetails.x, groupDetails.y, groupDetails.group_id), j;
                group.groupStyle(groupDetails.style);
                for (j = groupDetails.cards.length - 1; j >= 0; j--) {
                    group.addCard(groupDetails.cards[j]);
                    game.trigger("CardCreatedAndAddedToGroup", group.getGroupId(), groupDetails.cards[j]);
                }
            });
        });

        transport.on("group_repositioned", function (details, isActor) {
            var group = findGroup(details.group_old_id);
            group.moveTo(details.x, details.y);
            group.updateId(details.group_new_id);
            game.trigger("GroupRepositioned:" + details.group_old_id);
            game.trigger("GroupIdChanged", details.group_old_id, details.group_new_id);
            if (isActor) {
                game.trigger("GroupUnlocked", details.group_new_id);
            }
        });

        transport.on("group_restyled", function (details) {
            var group = findGroup(details.group_old_id);
            group.groupStyle(details.style_name);
            group.updateId(details.group_new_id);
            game.trigger("GroupIdChanged", details.group_old_id, details.group_new_id);
        });

        transport.on("group_created", function (details, isActor) {
            var sourceGroup, targetGroup, cardId = details.card,
                card = { cardId: cardId }, targetGroupInitialId;
            sourceGroup = findGroup(details.source_group_old_id);
            if (isActor) {
                targetGroup = findGroupContainingCard(cardId);
                targetGroupInitialId = targetGroup.getGroupId();
                targetGroup.updateId(details.target_group_new_id);
                game.trigger("GroupIdChanged", targetGroupInitialId, details.target_group_new_id);
                game.trigger("GroupUnlocked", targetGroup.getGroupId());
            } else {
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

        transport.on("card_moved", function (details, isActor) {
            var sourceGroup, targetGroup, cardId = details.card,
                targetIndex = details.target_card_idx,
                card = { cardId: cardId };
            sourceGroup = findGroup(details.source_group_old_id);
            targetGroup = findGroup(details.target_group_old_id);

            if (!isActor) {
                game.startMoving(card);
                targetGroup.addCardOnPosition(cardId, targetIndex);
                game.trigger("CardAddedToGroup", targetGroup.getGroupId(), cardId);
            }

            if (sourceGroup) {
                sourceGroup.updateId(details.source_group_new_id);
                game.trigger("GroupIdChanged", details.source_group_old_id, details.source_group_new_id);
                game.trigger("GroupUnlocked", details.source_group_new_id);
            }

            if (details.source_group_old_id !== details.target_group_old_id) {
                targetGroup.updateId(details.target_group_new_id);
                game.trigger("GroupIdChanged", details.target_group_old_id, details.target_group_new_id);
                game.trigger("GroupUnlocked", details.target_group_new_id);
            }
        });

        game.groupMovedByWidget = function (groupId, newX, newY) {
            transport.sendCommand("reposition_group", [groupId, newX, newY]);
            findGroup(groupId).moveTo(newX, newY);
            game.trigger("GroupLocked", groupId);
        };

        game.selectGroup = function (groupId) {
            var group = findGroup(groupId);
            if (selectedGroup) {
                selectedGroup.unselected();
            }
            group.selected();
            selectedGroup = group;
        };

        game.startMoving = function (card) {
            var group = findGroupContainingCard(card.cardId);
            card.moveStartGroupId = group.getGroupId();
            card.moveStartCardIdx = group.indexOf(card.cardId);
            group.removeCard(card.cardId);
            if (group.size() === 0) {
                console.log('GroupRemoved ' + group.getGroupId());
                removeGroup(group);
                game.trigger("GroupRemoved", group.getGroupId());
            } else {
                game.trigger("CardRemovedFromGroup", group.getGroupId(), card.cardId);
                game.trigger("GroupLocked", group.getGroupId());
            }
        };

        game.droppedOut = function (card, x, y) {
            var cardId = card.cardId,
                newGroup = addGroup(x, y);

            newGroup.addCard(cardId);

            game.trigger("CardAddedToGroup", newGroup.getGroupId(), cardId);
            game.trigger("GroupLocked", newGroup.getGroupId());

            transport.createGroup(card.moveStartGroupId, card.moveStartCardIdx, [x, y]);
        };

        game.receiveCard = function (draggedCard, droppedOnGroupId) {
            var group = findGroup(droppedOnGroupId),
                cardIdx = group.addCard(draggedCard.cardId);
            game.trigger("CardAddedToGroup", group.getGroupId(), draggedCard.cardId);
            game.trigger("GroupLocked", group.getGroupId());
            game.selectGroup(droppedOnGroupId);

            // TODO function to call back if something went wrong?
            transport.moveCard(draggedCard.moveStartGroupId, draggedCard.moveStartCardIdx, droppedOnGroupId, cardIdx);
        };

        game.cardReceivedCard = function (draggedCard, droppedOnCardId) {
            var group = findGroupContainingCard(droppedOnCardId),
                cardIdx = group.addCard(draggedCard.cardId, droppedOnCardId);
            game.trigger("CardAddedToGroup", group.getGroupId(), draggedCard.cardId);
            game.trigger("GroupLocked", group.getGroupId());
            game.selectGroup(group.getGroupId());

            // TODO function to call back if something went wrong?
            transport.moveCard(draggedCard.moveStartGroupId, draggedCard.moveStartCardIdx, group.getGroupId(), cardIdx);
        };

        game.changeStyleOfSelectGroup = function (styleName) {
            console.log("restyle_group");
            transport.sendCommand("restyle_group", [selectedGroup.getGroupId(), styleName]);
            selectedGroup.groupStyle(styleName);
        };

        game.init = function () {
            transport.init();
        };

        return game;
    };

    CardGame.Group = function (initialGroupId, initialX, initialY, config) {
        var groupId = initialGroupId, previousGroupId, group = {},
            cards = [],
            availableTypes = {
                "side_by_side_horizontal": {deltaX: config.cardWidth, deltaY: 0},
                "side_by_side_vertical": {deltaX: 0, deltaY: config.cardHeight},
                "overlapped_horizontal": {deltaX: config.cardFaceWidth, deltaY: 0},
                "overlapped_vertical": {deltaX: 0, deltaY: config.cardFaceHeight},
                "stack": {deltaX: 1, deltaY: 1}
            },
            groupStyle = availableTypes.stack,
            x = initialX,
            y = initialY,
            calculateCardX = function (cardIndex) {
                return cardIndex * groupStyle.deltaX;
            },
            calculateCardY = function (cardIndex) {
                return cardIndex * groupStyle.deltaY;
            },
            createCard = function (card, i) {
                return {
                    cardId: cards[i],
                    x: x + config.borderOffset + calculateCardX(i),
                    relativeX: config.borderOffset + calculateCardX(i),
                    y: y + config.borderOffset + calculateCardY(i),
                    relativeY: config.borderOffset + calculateCardY(i)
                };
            };

        _.extend(group, Backbone.Events);

        group.contains = function (card) {
            return cards.indexOf(card) !== -1;
        };
        group.indexOf = function (card) {
            return cards.indexOf(card);
        };
        group.getWidth = function () {
            return config.borderOffset * 2 + config.cardWidth + calculateCardX(cards.length - 1);
        };
        group.updateId = function (newGroupId) {
            previousGroupId = groupId;
            groupId = newGroupId;
        };
        group.getHeight = function () {
            return config.borderOffset * 2 + config.cardHeight + calculateCardY(cards.length - 1);
        };
        group.getCards = function () {
            return cards.map(createCard);
        };
        group.moveTo = function (newX, newY) {
            x = newX;
            y = newY;
        };
        group.addCard = function (cardId, insertAfterCardId) {
            var idx = 0;
            if (insertAfterCardId) {
                idx = cards.indexOf(insertAfterCardId) + 1;
            }
            return group.addCardOnPosition(cardId, idx);
        };
        group.addCardOnPosition = function (cardId, idx) {
            cards.splice(idx, 0, cardId);
            return idx;
        };
        group.removeCard = function (card) {
            var index = cards.indexOf(card);
            cards.splice(index, 1);
        };
        group.size = function () {
            return cards.length;
        };
        group.getGroupId = function () {
            return groupId;
        };
        group.getPreviousGroupId = function () {
            return previousGroupId;
        };
        group.getX = function () { return x; };
        group.getY = function () { return y; };
        group.groupStyle = function (groupStyleName) {
            groupStyle = availableTypes[groupStyleName];
            group.trigger("StyleChanged");
        };
        group.selected = function () {
            group.trigger("GroupSelected");
        };
        group.unselected = function () {
            group.trigger("GroupUnselected");
        };
        return group;
    };

}());

