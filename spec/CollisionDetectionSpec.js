describe("Collision detection", function () {
    var underTest,
        createComponent = function (name, top, left, right, bottom) {
            var c = {}, points = {top:top, right:right, left:left, bottom:bottom };
            c.getPoints = function () {
                return points;
            };
            c.getModel = function () {
                return name;
            };
            c.onCollisionStart = function () {
            };
            c.onCollisionStop = function () {
            };
            c.onCollisionAccepted = function(){
            };
            c.onNoCollisionFound = function(){
            };
            c.moveTo = function (top, left, right, bottom) {
                points = {top:top, right:right, left:left, bottom:bottom };
            };
            return c;
        };

    beforeEach(function () {
        underTest = CardGame.CollisionDetection();
    });

    describe("Basic collisions", function () {

        it("should not detect collisions of object with itself", function () {
            var ca = createComponent("a", 10, 10, 20, 20),
                cb = createComponent("b", 10, 10, 20, 20);
            spyOn(ca, "onCollisionStart");
            underTest.detectCollision(ca, [ca, cb]);
            expect(ca.onCollisionStart).not.toHaveBeenCalled();
        });

        it("should detect collisions of objects completely overlapping", function () {
            var ca = createComponent("a", 10, 10, 20, 20),
                cb = createComponent("b", 10, 10, 20, 20);
            spyOn(cb, "onCollisionStart");
            underTest.detectCollision(ca, [ca, cb]);
            expect(cb.onCollisionStart).toHaveBeenCalledWith("a");
        });

        it("should not detect collisions of objects overlapping from top", function () {
            var ca = createComponent("a", 10, 10, 20, 20),
                cb = createComponent("b", 20, 10, 20, 30),
                cc = createComponent("c", 21, 10, 20, 31);
            spyOn(cb, "onCollisionStart");
            spyOn(cc, "onCollisionStart");
            underTest.detectCollision(ca, [ca, cb]);
            underTest.detectCollision(ca, [ca, cc]);
            expect(cb.onCollisionStart).not.toHaveBeenCalledWith("a");
            expect(cc.onCollisionStart).not.toHaveBeenCalled();
        });

        it("should detect collisions of objects overlapping on left", function () {
            var ca = createComponent("a", 10, 20, 30, 20),
                cb = createComponent("b", 10, 10, 20, 20),
                cc = createComponent("c", 10, 10, 19, 20);
            spyOn(cb, "onCollisionStart");
            spyOn(cc, "onCollisionStart");
            underTest.detectCollision(ca, [ca, cb]);
            underTest.detectCollision(ca, [ca, cc]);
            expect(cb.onCollisionStart).toHaveBeenCalledWith("a");
            expect(cc.onCollisionStart).not.toHaveBeenCalled();
        });

        it("should not detect collisions of objects overlapping on right", function () {
            var ca = createComponent("a", 10, 10, 20, 20),
                cb = createComponent("b", 10, 20, 30, 20),
                cc = createComponent("c", 10, 21, 30, 20);
            spyOn(cb, "onCollisionStart");
            spyOn(cc, "onCollisionStart");
            underTest.detectCollision(ca, [ca, cb]);
            underTest.detectCollision(ca, [ca, cc]);
            expect(cb.onCollisionStart).not.toHaveBeenCalledWith("a");
            expect(cc.onCollisionStart).not.toHaveBeenCalled();
        });

        it("should detect collisions of objects overlapping on bottom", function () {
            var ca = createComponent("a", 20, 10, 20, 30),
                cb = createComponent("b", 10, 10, 20, 20),
                cc = createComponent("c", 10, 21, 20, 21);
            spyOn(cb, "onCollisionStart");
            spyOn(cc, "onCollisionStart");
            underTest.detectCollision(ca, [ca, cb]);
            underTest.detectCollision(ca, [ca, cc]);
            expect(cb.onCollisionStart).toHaveBeenCalledWith("a");
            expect(cc.onCollisionStart).not.toHaveBeenCalled();
        });

    });

    describe("Multiple collisions", function () {
        it("should notify just first collision", function () {
            var ca = createComponent("a", 10, 10, 20, 20),
                cb = createComponent("b", 10, 10, 20, 20),
                cc = createComponent("c", 10, 10, 20, 20);
            spyOn(cb, "onCollisionStart");
            spyOn(cc, "onCollisionStart");
            underTest.detectCollision(ca, [ca, cb, cc]);
            expect(cb.onCollisionStart).toHaveBeenCalledWith("a");
            expect(cc.onCollisionStart).not.toHaveBeenCalledWith("a")
        });
    });

    describe("Collision events", function () {
        it("should notify on collision start", function () {
            var ca = createComponent("a", 10, 10, 20, 20),
                cb = createComponent("b", 10, 10, 20, 20);
            spyOn(cb, "onCollisionStart");
            underTest.detectCollision(ca, [ca, cb]);
            expect(cb.onCollisionStart).toHaveBeenCalledWith("a");
        });

        it("should notify on collision stop", function () {
            var ca = createComponent("a", 10, 10, 20, 20),
                cb = createComponent("b", 10, 10, 20, 20);
            spyOn(cb, "onCollisionStop");
            underTest.detectCollision(ca, [ca, cb]);
            cb.moveTo(50, 50, 70, 70);
            underTest.detectCollision(ca, [ca, cb]);
            expect(cb.onCollisionStop).toHaveBeenCalledWith("a");
        });

        it("should notify collision accepted (eg after drag stop)", function () {
            var ca = createComponent("a", 10, 10, 20, 20),
                cb = createComponent("b", 10, 10, 20, 20);
            spyOn(cb, "onCollisionAccepted");
            underTest.detectCollision(ca, [ca, cb]);
            underTest.notifyCurrentCollision(ca);
            expect(cb.onCollisionAccepted).toHaveBeenCalledWith("a");
        });

        it("should only notify collision accepted for first collision", function(){
            var ca = createComponent("a", 10, 10, 20, 20),
                cb = createComponent("b", 10, 10, 20, 20),
                cc = createComponent("c", 10, 10, 20, 20);
            spyOn(cb, "onCollisionAccepted");
            spyOn(cc, "onCollisionAccepted");
            underTest.detectCollision(ca, [ca, cb, cc]);
            underTest.notifyCurrentCollision(ca);
            expect(cb.onCollisionAccepted).toHaveBeenCalled();
            expect(cc.onCollisionAccepted).not.toHaveBeenCalledWith("a");
        });
    });

    describe("No collision event", function() {
        it("should notify the moving object that it has collided with nothing", function() {
            var ca = createComponent("a", 10, 10, 20, 20);
            spyOn(ca, "onNoCollisionFound");
            underTest.detectCollision(ca, [ca]);
            underTest.notifyCurrentCollision(ca);
            expect(ca.onNoCollisionFound).toHaveBeenCalled();
        });
    });
});
