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
            return;
        }
        var c1 = gameComponent.getPoints(), c2 = currentComponent.getPoints();
        if (c1.bottom >= c2.top && c1.top <= c2.bottom &&
            c1.right >= c2.left && c1.left <= c2.right) {
            handleCollision(gameComponent, currentComponent);
        } else {
            handleNonCollision(gameComponent, currentComponent);
        }
    };

    detector.detectCollision = function(gameComponent, components){
        for(var i = 0; i < components.length; i++){
            checkCollisionBetween(gameComponent, components[i]);
        }
    };

    detector.notifyCurrentCollision = function(gameComponent){
        if(currentCollision){
            currentCollision.onCollisionAccepted(gameComponent.getModel());
        }
    };

    return detector;
}
