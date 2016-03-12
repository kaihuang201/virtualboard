var Menu = Menu || {};
(function (menu) {

	menu.init = function() {
		for (var key in PieceMap.pieces) {
			$("#add-piece-list").append( new Option(key, key) );
		}
		for (var key in CardMap.cards) {
			$("#add-card-list").append( new Option(key, key) );
		}
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
			$("#add-piece-modal").modal();
		});

		$("#addCard").on("click", function() {
			$("#add-card-modal").modal();
		});

		$("#addChessBoard").on("click", function() {
			VBoard.board.loadChessGame();
		});

		$("#penTool").on("click", function() {
			var user = null;
			var pos = {x:0, y:0};
			VBoard.board.generateNewPiece("penTool", user, pos);
		});		

		$("#submit-add-piece").click(function() {
			var selectedName = $("#add-piece-list").val();
			var user = null;
			var pos = {x:0, y:0};
			VBoard.board.generateNewPiece(selectedName, user, pos);
			$("#add-piece-modal").modal("toggle");
		});

		$("#submit-add-card").click(function() {
			var selectedName = $("#add-card-list").val();
			var user = null;
			var pos = {x:0, y:0};
			VBoard.board.generateNewCard(selectedName, user, pos);
			$("#add-card-modal").modal("toggle");
		});

	};

})(Menu);


$(document).ready(function () {
	Menu.init();
});