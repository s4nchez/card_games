/*global console */
var CardGame = CardGame || {};

(function () {
    "use strict";

    CardGame.CollisionDetection = function () {
        var detector = {}, currentCollision, checkCollisionBetween, handleCollision, handleNonCollision;

        handleCollision = function (gameComponent, currentComponent) {
            if (currentComponent !== currentCollision) {
                if (currentCollision) {
                    currentCollision.onCollisionStop(gameComponent.getModel());
                }
                currentCollision = currentComponent;
                currentCollision.onCollisionStart(gameComponent.getModel());
            }
        };

        handleNonCollision = function (gameComponent, currentComponent) {
            if (currentCollision && currentCollision === currentComponent) {
                currentCollision.onCollisionStop(gameComponent.getModel());
                currentCollision = null;
            }
        };

        checkCollisionBetween = function (gameComponent, currentComponent) {
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

        detector.detectCollision = function (gameComponent, components) {
            components.some(function (component) {
                return checkCollisionBetween(gameComponent, component);
            });
        };

        detector.notifyCurrentCollision = function (gameComponent) {
            if (currentCollision) {
                currentCollision.onCollisionAccepted(gameComponent.getModel());
            } else {
                gameComponent.onNoCollisionFound();
            }
        };

        return detector;
    };

}());