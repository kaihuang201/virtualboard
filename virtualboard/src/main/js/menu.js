var Menu = Menu || {};
(function (menu) {

	menu.init = function() {
		$("#viewMenuHover").mouseover(function() {
			$("#menu").animate({
				left:"0px"
			}, 300);
		});
		$("#canvas").mouseover(function() {
			$("#menu").animate({
				left:"-300px"
			}, 300);
		});
		$("#addPiece").on("click", function() {
			var name = "chessRookBlack";
			var user = null;
			var pos = {x:0, y:0};
			VBoard.board.generateNewPiece(name, user, pos);
		});

	};

})(Menu);


$(document).ready(function () {
	Menu.init();
});