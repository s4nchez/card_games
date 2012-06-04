function init() {
    var transport = createTransport(createGame());
    createGameStage("p1", transport);
    createGameStage("p2", transport);
    document.getElementById("add_card_p1").onclick = function () {
        transport.send({
//            element_id: 6,
//            action: "add_card"
            element_id: "set_0",
            action:"move_card",
            details: {
            }
        });
    };
}
