QUnit.module("SetBackgroundTests", function(hooks) {

    hooks.beforeEach(function (assert) {

    });

    hooks.afterEach(function(assert) {
        VBoard.board.clearBoard();
    });

    QUnit.test("Testing background on init", function(assert) {
        assert.equal(VBoard.board.background, null, "Expect the background to be null at the start");
    });

    QUnit.test("Testing json parsing for image files", function(assert) {

        var numBackgrounds = 0;

        $.getJSON("/static/json/backgroundmap.json", function (data) {
            $.each(data, function(key, value) {
                numBackgrounds++;
            });
        });
        console.log(numBackgrounds);
        assert.equal(numBackgrounds, 19, "Expect the number of backgrounds to be 19");
    });

    QUnit.test("Testing set background from null", function(assert) {

        VBoard.board.setBackground("/static/img/backgrounds/Bacon.jpg");

        assert.equal(VBoard.board.background.name, "/static/img/backgrounds/Bacon.jpg", "Expect the background to be Bacon");
    });

    QUnit.test("Testing set background from another background", function(assert) {

        VBoard.board.setBackground("/static/img/backgrounds/Bacon.jpg");

        VBoard.board.setBackground("/static/img/backgrounds/Carpet.jpg");

        assert.equal(VBoard.board.background.name, "/static/img/backgrounds/Carpet.jpg", "Expect the background to be Carpet");
    });

    QUnit.test("Testing resetting the background", function(assert) {

        VBoard.board.setBackground("/static/img/backgrounds/Bacon.jpg");

        VBoard.board.clearBoard();

        assert.equal(VBoard.board.background, null, "Expect the background to be null");
    });

});