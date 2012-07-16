describe("Game UI", function () {

    it("should start with some cards", function () {
        var group0 = CardGame.Group("group_0", 10, 10, {});
        spyOn(CardGame, "Group").andReturn(group0);
        var game = CardGame.Game(),
            stageListener = jasmine.createSpy();
        game.on("GroupCreated", stageListener);
        game.init([{ cards: [1, 2, 3], style: "stack", x: 10, y: 10 }]);
        expect(CardGame.Group).toHaveBeenCalledWith("group_0", 10, 10, {
            borderOffset:20,
            cardHeight:96,
            cardWidth:72,
            cardFaceWidth: 15,
            cardFaceHeight: 30
        });
        expect(stageListener).toHaveBeenCalledWith(group0, 10, 10);
    });

    it("should create a second group when card is dropped out", function(){
        var group0 = CardGame.Group("group_0", 10, 10, {});
        var group1 = CardGame.Group("group_1", 20, 20, {});
        spyOn(CardGame, "Group").andReturn(group0);
        var game = CardGame.Game(),
            stageListener = jasmine.createSpy();
        game.on("GroupCreated", stageListener);
        game.init([{ cards: [1, 2, 3], style: "stack", x: 10, y: 10 }]);
        game.startMoving(2);
        CardGame.Group.andReturn(group1);
        game.droppedOut(2, 20, 20);
        expect(stageListener).toHaveBeenCalledWith(group0, 10, 10);
        expect(stageListener).toHaveBeenCalledWith(group1, 20, 20);
    });

    it("should remove group if becomes empty", function(){
        var game = CardGame.Game(),
            stageListener = jasmine.createSpy(),
            group0Listener = jasmine.createSpy();
        game.on("GroupCreated", stageListener);
        game.on("GroupRemoved", group0Listener);
        game.init([{ cards: [1], style: "stack", x: 10, y: 10 }]);
        game.startMoving(1);
        expect(group0Listener).toHaveBeenCalledWith("group_0");
    });

    it("should insert a dropped card into the group", function() {
        var group0 = CardGame.Group("group_0", 10, 10, {});
        spyOn(CardGame, "Group").andReturn(group0);
        group0.addCard = jasmine.createSpy();
        var game = CardGame.Game();
        game.init([{ cards: [1, 2, 3], style: "stack", x: 10, y: 10 }]);
        game.startMoving(2);
        game.receiveCard(2, "group_0");
        expect(group0.addCard).toHaveBeenCalledWith(2);
    });

    it("should add card on top of existing card in group", function(){
        var group0 = CardGame.Group("group_0", 10, 10, {});
        spyOn(CardGame, "Group").andReturn(group0);
        var game = CardGame.Game();
        game.init([{ cards: [1, 2, 3], style: "stack", x: 10, y: 10 }]);
        game.startMoving(3);
        group0.addCard = jasmine.createSpy();
        game.cardReceivedCard(3, 1);
        expect(group0.addCard).toHaveBeenCalledWith(3, 1);
    });
});
