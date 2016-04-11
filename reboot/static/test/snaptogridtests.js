QUnit.module("SnapToGridTests", function(hooks) {

    VBoard.javascriptInit();
    VBoard.interface.init();
    VBoard.menu.init();

    hooks.beforeEach(function (assert) {
        VBoard.board.gridConfig.enabled = true;
    });

    hooks.afterEach(function(assert) {

    });

    QUnit.test("Test get closest grid position with default settings, positive values", function(assert) {
        closestPos = VBoard.board.getClosestGridPos(6, 7);
        expectedCloesestPos = {x:7, y:7};
        assert.equal(closestPos.x, expectedCloesestPos.x, "Expect closest x position to be 7");
        assert.equal(closestPos.y, expectedCloesestPos.y, "Expect closest y position to be 7");
    });

    QUnit.test("Test get closest grid position with default settings, negative values", function(assert) {
        closestPos = VBoard.board.getClosestGridPos(-1, -2);
        expectedCloesestPos = {x:-1, y:-1};
        assert.equal(closestPos.x, expectedCloesestPos.x, "Expect closest x position to be -1");
        assert.equal(closestPos.y, expectedCloesestPos.y, "Expect closest y position to be -1");
    });


    QUnit.test("Test get closest grid position, on grid position", function(assert) {
        closestPos = VBoard.board.getClosestGridPos(-1, -1);
        expectedCloesestPos = {x:-1, y:-1};
        assert.equal(closestPos.x, expectedCloesestPos.x, "Expect closest x position to be -1");
        assert.equal(closestPos.y, expectedCloesestPos.y, "Expect closest y position to be -1");
    });

    QUnit.test("Test get closest grid position, zeros", function(assert) {
        closestPos = VBoard.board.getClosestGridPos(0, 0);
        expectedCloesestPos = {x:1, y:1};
        assert.equal(closestPos.x, expectedCloesestPos.x, "Expect closest x position to be 1");
        assert.equal(closestPos.y, expectedCloesestPos.y, "Expect closest y position to be 1");
    });

    QUnit.test("Test outside sensitivity setting, default", function(assert) {
        mockPiece = {
            position: {
                x: 1,
                y: 1
            }
        };
        withinSensitivity = VBoard.board.getIsWithinSensitivity(mockPiece, {x:0, y:0});
        assert.equal(withinSensitivity, false, "Expect new position to be outside of sensitivity range");
    });

    QUnit.test("Test inside sensitivity setting, default", function(assert) {
        mockPiece = {
            position: {
                x: 1.5,
                y: 1.5
            }
        };
        withinSensitivity = VBoard.board.getIsWithinSensitivity(mockPiece, {x:0, y:0});
        assert.equal(withinSensitivity, false, "Expect new position to be inside of sensitivity range");
    });
    
});