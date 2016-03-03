VBoard.testing = true;

QUnit.module("Story7Tests", function(hooks) {

    hooks.beforeEach(function (assert) {
        VBoard.users.createNewUser("Phil", new BABYLON.Color3(123,0,123));
    });

    hooks.afterEach(function(assert) {
        VBoard.board.clearBoard();
    });

    QUnit.test("Testing Our Index Of on pieces", function(assert) {

        //Creating a new piece on the board
        var piece1 = VBoard.board.generateNewPiece("name", VBoard.users.getNone(), VBoard.board.getCenter());

        assert.equal(VBoard.board.ourIndexOf(piece1), 0, "We expect this piece to be in index 0 in our array");

        VBoard.board.remove(piece1);

        assert.equal(VBoard.board.ourIndexOf(piece1), -1, "We expect this piece to not be found because we deleted it");
    });

    QUnit.test("Testing Removing Pieces", function(assert) {

        //Getting number of pieces on the board before the piece is added
        var preSize = VBoard.board.pieces.length;

        //Creating a new piece on the board
        var piece1 = VBoard.board.generateNewPiece("name", VBoard.users.getNone(), VBoard.board.getCenter());

        VBoard.board.remove(piece1);

        assert.equal(VBoard.board.pieces.length, preSize, "We expect there to be the same number of pieces on the board as before");
    });

    QUnit.test("Testing Selecting a Piece and Seeing Outline", function(assert) {

        //Creating a new piece on the board
        var piece1 = VBoard.board.generateNewPiece("name", VBoard.users.getNone(), VBoard.board.getCenter());

        VBoard.board.setSelectedPiece(piece1);

        assert.equal(VBoard.selectedPiece.id, piece1.id, "We expect this piece to be the selected piece");
        assert.equal(piece1.outlineMesh.material.alpha, 0.3, "We expect this piece's outline mesh to be visible with an alpha of 0.3");

        VBoard.board.removeSelectedPiece();
    });

    QUnit.test("Testing Unselecting a Piece", function(assert) {

        //Creating a new piece on the board
        var piece1 = VBoard.board.generateNewPiece("name", VBoard.users.getNone(), VBoard.board.getCenter());

        VBoard.board.setSelectedPiece(piece1);

        VBoard.board.removeSelectedPiece();

        assert.equal(VBoard.selectedPiece, null, "We expect the selected piece to be null after being removed");
    });

    QUnit.test("Testing Moving Pieces", function(assert) {

        //Creating a new piece on the board
        var piece1 = VBoard.board.generateNewPiece("name", VBoard.users.getNone(), VBoard.board.getCenter());

        VBoard.board.setSelectedPiece(piece1);

        VBoard.board.movePiece(new BABYLON.Vector2(25,25));

        assert.equal(piece1.mesh.position.x, 25, "We expect this piece to be in the correct x position");
        assert.equal(piece1.mesh.position.y, 25, "We expect this piece to be in the correct y position");

        VBoard.board.movePiece(new BABYLON.Vector2(-25,-36));

        assert.equal(piece1.mesh.position.x, -25, "We expect this piece to be in the correct x position");
        assert.equal(piece1.mesh.position.y, -36, "We expect this piece to be in the correct y position");

        VBoard.board.removeSelectedPiece();
    });

    QUnit.test("Testing Moving Pieces Outside the Boundaries", function(assert) {

        //Creating a new piece on the board
        var piece1 = VBoard.board.generateNewPiece("name", VBoard.users.getNone(), VBoard.board.getCenter());

        VBoard.board.setSelectedPiece(piece1);

        VBoard.board.movePiece(new BABYLON.Vector2(51,25));

        assert.ok(piece1.mesh.position.x <= 50, "We expect this piece to be in the correct x position");
        assert.equal(piece1.mesh.position.y, 25, "We expect this piece to be in the correct y position");

        VBoard.board.movePiece(new BABYLON.Vector2(-51,36));

        assert.ok(piece1.mesh.position.x >= -50, "We expect this piece to be in the correct x position");
        assert.equal(piece1.mesh.position.y, 36, "We expect this piece to be in the correct y position");

        VBoard.board.movePiece(new BABYLON.Vector2(40,-96));

        assert.equal(piece1.mesh.position.x, 40, "We expect this piece to be in the correct x position");
        assert.ok(piece1.mesh.position.y >= -50, "We expect this piece to be in the correct y position");

        VBoard.board.movePiece(new BABYLON.Vector2(22,78));

        assert.equal(piece1.mesh.position.x, 22, "We expect this piece to be in the correct x position");
        assert.ok(piece1.mesh.position.y <= 50, "We expect this piece to be in the correct y position");

        VBoard.board.movePiece(new BABYLON.Vector2(57,99));
        assert.ok(piece1.mesh.position.x <= 50, "We expect this piece to be in the correct x position");
        assert.ok(piece1.mesh.position.y <= 50, "We expect this piece to be in the correct y position");

        VBoard.board.removeSelectedPiece();
    });

    QUnit.test("Testing Toggling a Piece Static and Not Static", function(assert) {

        //Creating a new piece on the board
        var piece1 = VBoard.board.generateNewPiece("name", VBoard.users.getNone(), VBoard.board.getCenter());
        assert.ok(!piece1.static, "We expect this piece to not be static");

        VBoard.board.toggleStatic(piece1);
        assert.ok(piece1.static, "We expect this piece to be static");

        VBoard.board.setSelectedPiece(piece1);

        VBoard.board.movePiece(new BABYLON.Vector2(25,25));
        assert.equal(piece1.mesh.position.x, 0, "We expect this piece to be in the correct x position, aka not moved");
        assert.equal(piece1.mesh.position.y, 0, "We expect this piece to be in the correct y position, aka not moved");

        VBoard.board.toggleStatic(piece1);
        assert.ok(!piece1.static, "We expect this piece to not be static");

        VBoard.board.movePiece(new BABYLON.Vector2(25,25));
        assert.equal(piece1.mesh.position.x, 25, "We expect this piece to be in the correct x position");
        assert.equal(piece1.mesh.position.y, 25, "We expect this piece to be in the correct y position");

        VBoard.board.removeSelectedPiece();
    });

});