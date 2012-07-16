describe("Group Component", function () {
    var group;

    beforeEach(function () {
        group = new CardGame.Group("some_id", 3, 7, {
            borderOffset:1,
            cardHeight:11,
            cardWidth:13,
            cardFaceWidth: 5,
            cardFaceHeight: 30
        });
    });

    it("should allow searching for card", function () {
        group.addCard(1);
        group.addCard(2);
        group.addCard(3);
        expect(group.contains(1)).toBeTruthy();
        expect(group.contains(4)).toBeFalsy();
    });

    it("should have a size", function(){
        group.addCard(1);
        group.addCard(2);
        group.addCard(3);
        expect(group.size()).toEqual(3);
    });

    it("should allow removing card", function () {
        group.addCard(1);
        group.addCard(2);
        group.addCard(3);
        group.removeCard(1);
        expect(group.contains(1)).toBeFalsy();
    });

    it("should add cards before existing cards", function(){
        group.addCard(1);
        group.addCard(2);
        expect(group.getCards()[0].cardId).toEqual(2);
        expect(group.getCards()[1].cardId).toEqual(1);
    })

    it("should add cards after existing card", function(){
        group.addCard(2);
        group.addCard(1);
        group.addCard(3,1);
        expect(group.getCards()[0].cardId).toEqual(1);
        expect(group.getCards()[1].cardId).toEqual(3);
        expect(group.getCards()[2].cardId).toEqual(2);
    })

});
