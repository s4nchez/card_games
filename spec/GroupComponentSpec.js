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

    });

    it("should calculate dimension cards a card is added", function () {
        group.addCard(1);
        expect(group.getPoints()).toEqual({
            top:7,
            left:3,
            right:3 + 1 + 13 + 1,
            bottom:7 + 1 + 11 + 1
        })
    });

    it("should calculate dimension when more cards are added", function () {
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

});
