describe("Game UI", function () {

    it("should start with some cards", function () {
        var game = CardGame.GameUI(),
            stageListener = jasmine.createSpy(),
            groupListener = jasmine.createSpy();
        game.on("GroupCreated", stageListener);
        game.on("CardAdded:group_0", groupListener);
        game.init([1, 2, 3]);
        expect(stageListener).toHaveBeenCalledWith("group_0");
        expect(groupListener).toHaveBeenCalledWith(1);
        expect(groupListener).toHaveBeenCalledWith(2);
        expect(groupListener).toHaveBeenCalledWith(3);
    });

    it("should create a second group when card is dropped out", function(){
        var game = CardGame.GameUI(),
            stageListener = jasmine.createSpy(),
            group0Listener = jasmine.createSpy(),
            group1Listener = jasmine.createSpy();
        game.on("GroupCreated", stageListener);
        game.on("CardRemoved:group_0", group0Listener);
        game.on("CardAdded:group_1", group1Listener);
        game.init([1, 2, 3]);
        game.startMoving(2);
        expect(group0Listener).toHaveBeenCalledWith(2);
        game.droppedOut(2);
        expect(stageListener).toHaveBeenCalledWith("group_1");
        expect(group1Listener).toHaveBeenCalledWith(2);
    });

    it("should insert a dropped card into the group", function() {
        var game = CardGame.GameUI(),
            groupListener = jasmine.createSpy();
        game.init([1, 2, 3]);
        game.startMoving(2);
        game.on("CardAdded:group_0", groupListener);
        game.receiveCard(2, 3);
        expect(groupListener).toHaveBeenCalledWith(2);
    });
});
