QUnit.module("NotepadSplitLinesTests", function(hooks) {

    VBoard.javascriptInit();
    VBoard.interface.init();
    VBoard.menu.init();

    hooks.beforeEach(function (assert) {
        
    });

    hooks.afterEach(function(assert) {

    });

    QUnit.test("Testing splitLine with \"askjdflkasjdfklasd\" and lineSize=8 as input", function(assert) {
        var lines = VBoard.board.splitLines("askjdflkasjdfklasd",8);
        assert.equal(lines[0], "askjdfl-", "Expect the first seven characters followed by a hyphen");
        assert.equal(lines[1], "kasjdfk-", "Expect eighth to fourteenth characters followed by a hypen");
        assert.equal(lines[2], "lasd", "Expect the last four characters");
    });

    QUnit.test("Testing splitLine with \"The quick brown fox jumps over the lazy dog\" and lineSize=8 as input", function(assert) {
        var lines = VBoard.board.splitLines("The quick brown fox jumps over the lazy dog",8);
        assert.equal(lines[0], "The", "Expect to be just \"The\"");
        assert.equal(lines[1], " quick", "Expect to be just \" quick\"");
        assert.equal(lines[2], " brown", "Expect to be just \" brown\"");
        assert.equal(lines[3], " fox", "Expect to be just \" fox\"");
        assert.equal(lines[4], " jumps", "Expect to be just \" jumps\"");
        assert.equal(lines[5], " over", "Expect to be just \" over\"");
        assert.equal(lines[6], " the", "Expect to be just \" the\"");
        assert.equal(lines[7], " lazy", "Expect to be just \" lazy\"");
        assert.equal(lines[8], " dog", "Expect to be just \" dog\"");
    });    

    QUnit.test("Testing splitLine with \"The quick brown fox jumps over the lazy dog\" and lineSize=16 as input", function(assert) {
        var lines = VBoard.board.splitLines("The quick brown fox jumps over the lazy dog",16);
        assert.equal(lines[0], "The quick brown", "Expect to be just \"The quick brown \"");
        assert.equal(lines[1], " fox jumps over", "Expect to be just \" fox jumps over \"");
        assert.equal(lines[2], " the lazy dog", "Expect to be just \"the lazy dog\"");
    });

    QUnit.test("Testing splitLine with \"The quick brown fox\" and lineSize=4 as input", function(assert) {
        var lines = VBoard.board.splitLines("The quick brown fox",4);
        assert.equal(lines[0], "The", "Expect to be just \"The\"");
        assert.equal(lines[1], "qui-", "Expect to be just \"qui-\"");
        assert.equal(lines[2], "ck", "Expect to be just \" ck\"");
        assert.equal(lines[3], "bro-", "Expect to be just \"bro-\"");
        assert.equal(lines[4], "wn", "Expect to be just \" wn\"");
        assert.equal(lines[5], " fox", "Expect to be just \" fox\"");
    }); 

});