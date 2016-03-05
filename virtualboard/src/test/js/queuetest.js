VBoard.testing = true;

QUnit.module( "QueueTest", function(hooks) {

    hooks.beforeEach(function (assert) {
        VBoard.users.createNewUser("Phil", new BABYLON.Color3(123,0,123));
    });

    hooks.afterEach(function(assert) {
        VBoard.board.clearBoard();
    });

    QUnit.test("Testing Generating Pieces", function(assert) {

        //Getting number of pieces on the board before the piece is added
        var preSize = VBoard.board.pieces.length;

        //Creating a new piece on the board
        var piece1 = VBoard.board.generateNewPiece("name", VBoard.users.getNone(), VBoard.board.getCenter());

        assert.equal(VBoard.board.pieces.length, preSize+1, "We expect there to be one more piece on the board");

        assert.equal(piece1.name, "name", "We expect name to be name");
        assert.equal(piece1.user, VBoard.users.getNone(), "We expect the user to be the none user");
        assert.equal(piece1.mesh.position.x, VBoard.board.getCenter().x, "We expect the piece to be at the center of the board - X");
        assert.equal(piece1.mesh.position.y, VBoard.board.getCenter().y, "We expect the piece to be at the center of the board - Y");
    });


    QUnit.test("Testing Piece is actually on the board", function(assert) {

        //generating two pieces
        var piece1 = VBoard.board.generateNewPiece("name", VBoard.users.getNone(), VBoard.board.getCenter());
        var piece2 = VBoard.board.generateNewPiece("name2", VBoard.users.getNone(), VBoard.board.getCenter());

        assert.ok(piece1.mesh.position.z > piece2.mesh.position.z, "We expect piece 1 to be on the bottom of the board (greater z index)");

        VBoard.board.bringToFront(piece1);
        assert.ok(piece1.mesh.position.z < piece2.mesh.position.z, "We expect piece 2 to be on the bottom of the board (greater z index)");

        VBoard.board.pushToBack(piece1);
        assert.ok(piece1.mesh.position.z > piece2.mesh.position.z, "We expect piece 1 to be back on the bottom of the board (greater z index)");

    });

});