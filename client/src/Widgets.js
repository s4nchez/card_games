/*global console, Kinetic */
var CardGame = CardGame || {};

(function () {
    "use strict";

    CardGame.Assets = function () {
        var assets = {}, imageObj,
            cards = [
                "AS", "AC", "AD", "AH",
                "KS", "KC", "KD", "KH",
                "QS", "QC", "QD", "QH",
                "JS", "JC", "JD", "JH",
                "back"
            ],
            imageDimensions = {width: 72, height: 96},
            calculateCardSprites = function () {
                var i, result = {};
                for (i = 0; i < cards.length; i++) {
                    result[cards[i]] = {
                        x: i * imageDimensions.width,
                        y: 0,
                        width: imageDimensions.width,
                        height: imageDimensions.height
                    };
                }
                return result;
            }, spriteSpecs;

        assets.load = function (callback) {
            spriteSpecs = calculateCardSprites();
            imageObj = new window.Image();
            imageObj.onload = function () {
                callback();
            };
            imageObj.src = "images/classic-cards/all.png";
        };
        assets.getCardSprite = function (cardId, draggable) {
            if (!draggable) {
                draggable = false;
            }
            var sprite = new Kinetic.Sprite({
                x: 0,
                y: 0,
                image: imageObj,
                animation: 'idle',
                animations: { idle: [spriteSpecs[cardId]] },
                frameRate: 1,
                draggable: draggable
            });
            sprite.getWidth = function () { return imageDimensions.width; };
            sprite.getHeight = function () { return imageDimensions.height; };
            return sprite;
        };
        return assets;
    };

    CardGame.Stage = function (ui, options) {
        var stage = {}, groups = {}, cards = {}, layer = new Kinetic.Layer(),
            internalStage = new Kinetic.Stage(options),
            collisionDetection = CardGame.CollisionDetection(),
            components = [],
            byZIndex = function (a, b) {
                return b.getComponent().getZIndex() - a.getComponent().getZIndex();
            },
            remove = function (gameComponent) {
                var ix = components.indexOf(gameComponent);
                components.splice(ix, 1);
                layer.remove(gameComponent.getComponent());
                layer.draw();
            },
            redrawGroupAndReorderComponents = function (groupId) {
                var group = groups[groupId];
                if (!group) {
                    console.error('bang!');
                }
                group.redraw();
                components.sort(byZIndex);
            },
            assets = CardGame.Assets();

        stage.draw = function () {
            layer.draw();
        };

        stage.add = function (gameComponent) {
            layer.add(gameComponent.getComponent());
            components.push(gameComponent);
            components.sort(byZIndex);
        };

        stage.detectCollisions = function (gameComponent) {
            collisionDetection.detectCollision(gameComponent, components);
        };

        stage.notifyCurrentCollision = function (gameComponent) {
            collisionDetection.notifyCurrentCollision(gameComponent);
        };

        ui.on("GroupCreated", function (group, x, y) {
            groups[group.getGroupId()] = CardGame.GroupWidget(stage, ui, group, {
                x: x,
                y: y
            });
        });

        ui.on("GroupRemoved", function (groupId) {
            components.some(function (component) {
                if (component.getModel().groupId && component.getModel().groupId === groupId) {
                    remove(component);
                    return true;
                }
            });
            delete groups[groupId];
        });

        ui.on("GroupIdChanged", function (oldGroupId, newGroupId) {
            components.some(function (component) {
                if (component.getModel().previousGroupId && component.getModel().previousGroupId === oldGroupId) {
                    component.groupId = newGroupId;
                    return true;
                }
            });
            groups[newGroupId] = groups[oldGroupId];
            delete groups[oldGroupId];
        });

        ui.on("CardCreatedAndAddedToGroup", function (groupId, cardId) {
            cards[cardId] = CardGame.CardWidget(stage, ui, {
                cardId: cardId
            });
            redrawGroupAndReorderComponents(groupId);
        });

        ui.on("CardRemovedFromGroup", function (groupId, cardId) {
            redrawGroupAndReorderComponents(groupId);
        });

        ui.on("CardAddedToGroup", function (groupId, cardId) {
            redrawGroupAndReorderComponents(groupId);
        });

        ui.on("GroupLocked", function (groupId) {
            console.log("GroupLocked: %s", groupId);
            groups[groupId].lock();
        });

        ui.on("GroupUnlocked", function (groupId) {
            console.log("GroupUnlocked: %s", groupId);
            groups[groupId].unlock();
        });

        ui.on("GroupRepositioned", function (groupId) {
            groups[groupId].redraw();
        });

        stage.getCardWidget = function (cardId) {
            return cards[cardId];
        };

        stage.getCardSprite = assets.getCardSprite;

        internalStage.add(layer);

        assets.load(function () {
            ui.init();
        });

        return stage;
    };

    CardGame.CollisionableWidget = function (stage, component) {
        component.getComponent().on("dragmove", function () {
            stage.detectCollisions(component);
            component.getComponent().moveToTop();
        });
        component.getComponent().on("dragstart", function () {
            component.getComponent().moveToTop();
        });
        component.getComponent().on("dragend", function () {
            stage.notifyCurrentCollision(component);
        });
    };

    CardGame.GroupWidget = function (stage, ui, groupUI, options) {
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
            cardsMirroring = function (groupComponent) {
                var mirror = {}, cardImages = [];

                mirror.addCard = function (card, x, y) {
                    var image = stage.getCardSprite(card);
                    image.setX(x);
                    image.setY(y);
                    cardImages.push(image);
                    groupComponent.add(image);
                    stage.draw();
                };

                mirror.clear = function () {
                    cardImages.forEach(function (cardImage) {
                        groupComponent.remove(cardImage);
                    });
                    cardImages = [];
                };

                return mirror;
            },
            mirror = cardsMirroring(groupComponent),
            hideCardComponents = function () {
                groupUI.getCards().forEach(function (card) {
                    stage.getCardWidget(card.cardId).getComponent().setAlpha(0);
                });
            },
            applyToCards = function (callback) {
                var uiCards = groupUI.getCards();
                uiCards.forEach(function (card) {
                    callback(card, stage.getCardWidget(card.cardId));
                });
            },
            redrawInternals = function () {
                groupComponent.setX(groupUI.getX());
                groupComponent.setY(groupUI.getY());
                border.setWidth(groupUI.getWidth());
                border.setHeight(groupUI.getHeight());
                mirror.clear();
                applyToCards(function (cardPosition, cardWidget) {
                    var cardComponent = cardWidget.getComponent();
                    mirror.addCard(cardPosition.cardId, cardPosition.relativeX, cardPosition.relativeY);
                    cardComponent.setAlpha(1);
                    cardComponent.setX(cardPosition.x);
                    cardComponent.setY(cardPosition.y);
                    cardComponent.moveToTop();
                });
            };

        groupComponent.add(border);

        group.getComponent = function () {
            return groupComponent;
        };

        group.lock = function () {
            groupComponent.setDraggable(false);
            applyToCards(function (card, widget) {
                widget.lock();
            });
        };

        group.unlock = function () {
            groupComponent.setDraggable(true);
            applyToCards(function (card, widget) {
                widget.unlock();
            });
        };

        group.onCollisionStart = function (model) {
            hideCardComponents();
        };

        group.onCollisionStop = function (model) {
            redrawInternals();
        };

        group.onCollisionAccepted = function (model) {
            if (model.cardId) {
                ui.receiveCard(model, groupUI.getGroupId());
            }
        };

        group.onNoCollisionFound = function () {
        };

        groupUI.on("GroupSelected", function () {
            border.setStroke("#00FF00");
        });

        groupUI.on("GroupUnselected", function () {
            border.setStroke("#CCCCCC");
        });

        groupUI.on("StyleChanged", redrawInternals);

        groupComponent.on("click", function () {
            ui.selectGroup(groupUI.getGroupId());
            stage.draw();
        });

        group.getPoints = function () {
            var pos = border.getAbsolutePosition();
            return {
                top: pos.y,
                left: pos.x,
                right: pos.x + border.getWidth(),
                bottom: pos.y + border.getHeight()
            };
        };

        group.getModel = function () {
            return { groupId: groupUI.getGroupId(), previousGroupId: groupUI.getPreviousGroupId() };
        };

        (function () {
            groupComponent.on("dragstart", hideCardComponents);
            groupComponent.on("dragend", function () {
                var pos = border.getAbsolutePosition();
                ui.groupMovedByWidget(groupUI.getGroupId(), pos.x, pos.y);
                redrawInternals();
            });
        }());

        stage.add(group);

        group.redraw = redrawInternals;
        return group;
    };

    CardGame.CardWidget = function (stage, ui, options) {
        var cardId = options.cardId,
            card = {},
            image = stage.getCardSprite(options.cardId, true);

        card.cardId = cardId;

        image.on("dragstart", function () {
            ui.startMoving(card);
        });

        card.getComponent = function () {
            return image;
        };

        card.getModel = function () {
            var model = { cardId: cardId };
            if (card.moveStartGroupId) {
                model.moveStartGroupId = card.moveStartGroupId;
            }
            model.moveStartCardIdx = card.moveStartCardIdx;
            return model;
        };

        card.getPoints = function () {
            return {
                top: image.getY(),
                left: image.getX(),
                right: image.getX() + image.getWidth(),
                bottom: image.getY() + image.getHeight()
            };
        };

        card.lock = function () {
            image.setDraggable(false);
        };

        card.unlock = function () {
            image.setDraggable(true);
        };

        card.onCollisionStart = function () {
        };

        card.onCollisionStop = function () {
        };

        card.onCollisionAccepted = function (model) {
            ui.cardReceivedCard(model, cardId);
        };

        card.onNoCollisionFound = function () {
            ui.droppedOut(card, image.getX(), image.getY());
        };

        CardGame.CollisionableWidget(stage, card);

        stage.add(card);
        image.start();

        return card;
    };

}());
