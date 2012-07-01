describe("Group Component", function () {
    var group;

    beforeEach(function () {
        group = new CardGame.GroupComponent("some_id", 3, 7, {
            borderOffset:1,
            cardHeight:11,
            cardWidth:13,
            cardFaceWidth: 5
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

    it("should calculate points cards a card is added", function () {
        group.addCard(1);
        expect(group.getPoints()).toEqual({
            top:7,
            left:3,
            right:3 + 1 + 13 + 1,
            bottom:7 + 1 + 11 + 1
        })
    });

    it("should calculate points when more cards are added", function () {
        group.addCard(1);
        group.addCard(2);
        group.addCard(3);
        expect(group.getPoints()).toEqual({
            top:7,
            left:3,
            right:3 + 1 + 5 + 5 + 13 + 1,
            bottom:7 + 1 + 11 + 1
        })
    });

    it("should calculate points after moving", function(){
        group.addCard(1);
        group.moveTo(4, 6);
        expect(group.getPoints()).toEqual({
            top:6,
            left:4,
            right:4 + 1 + 13 + 1,
            bottom:6 + 1 + 11 + 1
        })
    })

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
