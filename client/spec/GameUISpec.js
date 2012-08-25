describe("Game UI", function () {

    var transport;

    beforeEach(function(){
        transport = {
            createGroup: jasmine.createSpy(),
            moveCard: jasmine.createSpy()
        }
        _.extend(transport, Backbone.Events);
    });

    it("should start with some cards", function () {
        var group0 = CardGame.Group("group_0", 10, 10, {});
        spyOn(CardGame, "Group").andReturn(group0);
        var game = CardGame.Game(transport),
            stageListener = jasmine.createSpy();
        game.on("GroupCreated", stageListener);
        transport.trigger("InitialState", [{ cards: [1, 2, 3], group_id: "group_0", style: "stack", x: 10, y: 10 }]);
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
        var game = CardGame.Game(transport),
            stageListener = jasmine.createSpy();
        game.on("GroupCreated", stageListener);
        transport.trigger("InitialState", [{ cards: [1, 2, 3], group_id: "group_0", style: "stack", x: 10, y: 10 }]);
        game.startMoving({cardId:2});
        CardGame.Group.andReturn(group1);
        game.droppedOut(2, 20, 20);
        expect(stageListener).toHaveBeenCalledWith(group0, 10, 10);
        expect(stageListener).toHaveBeenCalledWith(group1, 20, 20);
    });

    it("should lock source and target groups when card is dropped out", function(){
        var group0 = CardGame.Group("group_0", 10, 10, {});
        var group1 = CardGame.Group("group_1", 20, 20, {});
        var card = {cardId:2, moveStartGroupId:"group_0"};
        spyOn(CardGame, "Group").andReturn(group0);
        var game = CardGame.Game(transport),
            stageListener = jasmine.createSpy();
        game.on("GroupLocked", stageListener);
        transport.trigger("InitialState", [{ cards: [1, 2, 3], group_id: "group_0", style: "stack", x: 10, y: 10 }]);
        game.startMoving(card);
        CardGame.Group.andReturn(group1);
        game.droppedOut(card, 20, 20);
        expect(stageListener).toHaveBeenCalledWith("group_0");
        expect(stageListener).toHaveBeenCalledWith("group_1");
    });

    it("should remove group if becomes empty", function(){
        var game = CardGame.Game(transport),
            stageListener = jasmine.createSpy(),
            group0Listener = jasmine.createSpy();
        game.on("GroupCreated", stageListener);
        game.on("GroupRemoved", group0Listener);
        transport.trigger("InitialState", [{ cards: [1], group_id: "group_0", style: "stack", x: 10, y: 10 }]);
        game.startMoving({cardId:1});
        expect(group0Listener).toHaveBeenCalledWith("group_0");
    });

    it("should insert a dropped card into the group", function() {
        var group0 = CardGame.Group("group_0", 10, 10, {});
        spyOn(CardGame, "Group").andReturn(group0);
        spyOn(group0, "addCard").andCallThrough();
        var game = CardGame.Game(transport);
        transport.trigger("InitialState", [{ cards: [1, 2, 3], group_id: "group_0", style: "stack", x: 10, y: 10 }]);
        game.startMoving({cardId:2});
        game.receiveCard({cardId:2, moveStartGroupId:"group_0"}, "group_0");
        expect(group0.addCard).toHaveBeenCalledWith(2);
    });

    it("should add card on top of existing card in group", function(){
        var group0 = CardGame.Group("group_0", 10, 10, {});
        spyOn(CardGame, "Group").andReturn(group0);
        var game = CardGame.Game(transport);
        transport.trigger("InitialState", [{ cards: [1, 2, 3], group_id: "group_0", style: "stack", x: 10, y: 10 }]);
        game.startMoving({cardId:3});
        group0.addCard = jasmine.createSpy();
        game.cardReceivedCard({cardId:3, moveStartGroupId:"group_0"}, 1);
        expect(group0.addCard).toHaveBeenCalledWith(3, 1);
    });

    describe("Transport event handling", function(){
       it("should reposition group", function(){
           var game = CardGame.Game(transport),
               group = CardGame.Group("g1", 10, 10, {}),
               listener = jasmine.createSpy();
           spyOn(CardGame, "Group").andReturn(group);
           game.on("GroupRepositioned", listener);
           transport.trigger("InitialState", [{ cards: [1,2,3], group_id: "g1", style: "stack", x:10, y: 10}]);
           transport.trigger("group_repositioned", {group_new_id: "g2", group_old_id: "g1", x: 15, y: 30});
           expect(listener).toHaveBeenCalledWith("g1");
       })
    });
});
