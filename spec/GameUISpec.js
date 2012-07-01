describe("Game UI", function () {

    it("should start with some cards", function () {
        var group0 = CardGame.GroupComponent("group_0", 10, 10, {});
        spyOn(CardGame, "GroupComponent").andReturn(group0);
        var game = CardGame.GameUI(),
            stageListener = jasmine.createSpy();
        game.on("GroupCreated", stageListener);
        game.init([1, 2, 3]);
        expect(CardGame.GroupComponent).toHaveBeenCalledWith("group_0", 10, 10, {});
        expect(stageListener).toHaveBeenCalledWith(group0, 10, 10);
    });

    it("should create a second group when card is dropped out", function(){
        var group0 = CardGame.GroupComponent("group_0", 10, 10, {});
        var group1 = CardGame.GroupComponent("group_1", 20, 20, {});
        spyOn(CardGame, "GroupComponent").andReturn(group0);
        var game = CardGame.GameUI(),
            stageListener = jasmine.createSpy();
        game.on("GroupCreated", stageListener);
        game.init([1, 2, 3]);
        game.startMoving(2);
        CardGame.GroupComponent.andReturn(group1);
        game.droppedOut(2, 20, 20);
        expect(stageListener).toHaveBeenCalledWith(group0, 10, 10);
        expect(stageListener).toHaveBeenCalledWith(group1, 20, 20);
    });

    it("should remove group if becomes empty", function(){
        var game = CardGame.GameUI(),
            stageListener = jasmine.createSpy(),
            group0Listener = jasmine.createSpy();
        game.on("GroupCreated", stageListener);
        game.on("GroupRemoved", group0Listener);
        game.init([1]);
        game.startMoving(1);
        expect(group0Listener).toHaveBeenCalledWith("group_0");
    });

    it("should insert a dropped card into the group", function() {
        var group0 = CardGame.GroupComponent("group_0", 10, 10, {});
        spyOn(CardGame, "GroupComponent").andReturn(group0);
        group0.addCard = jasmine.createSpy();
        var game = CardGame.GameUI();
        game.init([1, 2, 3]);
        game.startMoving(2);
        game.receiveCard(2, "group_0");
        expect(group0.addCard).toHaveBeenCalledWith(2);
    });
});
