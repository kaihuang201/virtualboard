var VBoard = VBoard || {};
(function (vb) {
	vb.menu = {
		init: function () {
			//TODO: menu should not be active until we are in a game session
			$.getJSON("/static/json/piecemap.json", function (data) {
				$.each(data, function(key, value) {
					vb.board.pieceNameMap[key] = value;
				});
				vb.menu.loadOptions();
			});

			$("#viewMenuHover").mouseover(function () {
				$("#menu").animate({
					left:"0px"
				}, 300);
			});

			$("#canvas").mouseover(function () {
				//TODO: should not animate when user is clicking and dragging
				$("#menu").animate({
					left:"-300px"
				}, 300);
			});
			$("#addPiece").on("click", function () {
				$("#add-piece-modal").modal();
			});

			$("#addChessBoard").on("click", function () {
				vb.board.loadChessGame();
			});

			//$("#penTool").on("click", function () {
			//	var user = null;
			//	var pos = {x:0, y:0};
			//	vb.board.generateNewPiece("penTool", user, pos);
			//});		

			$("#submit-add-piece").click(function () {
				var selectedName = $("#add-piece-list").val();
				var user = null;
				//TODO: use vb.camera.position.x/y instead of board center
				//var pos = {x:0, y:0};

				//TODO: replace with actual method
				//vb.board.generateNewPiece(selectedName, user, pos);
				var mapEntry = vb.board.pieceNameMap[selectedName];
				var data = {
					"icon" : mapEntry.icon,
					"s" : mapEntry.size,
					"pos" : [camera.position.x, camera.position.y],
					"r" : camera.rotation.z
				};
				vb.sessionIO.addPiece(data);
				$("#add-piece-modal").modal("toggle");
			});

		},

		loadOptions: function () {
			for (var key in vb.board.pieceNameMap.pieces) {
				$("#add-piece-list").append( new Option(key, key) );
			}
		},

		//TODO: instead of hard coding the menu options
		//		we should query the piece itself for relevant options
		//		if piece is null, we should bring up a menu with "add a piece"
		createContextMenu: function (piece) {
			//make the context menu appear at your mouse position
			$("#context-menu").offset({top: vb.scene.pointerY, left: vb.scene.pointerX-5});
			$("#context-menu").css("visibility", "visible");

			//clear previous onclick function bindings
			$("#context-delete").off("click");
			$("#context-back").off("click");
			$("#context-front").off("click");
			$("#context-static").off("click");

			//set new onclick function bindings
			$("#context-delete").on("click", function(){
				vb.board.remove(piece);
				$("#context-menu").css("visibility", "hidden");
			});
			$("#context-back").on("click", function(){
				vb.board.pushToBack(piece);
				$("#context-menu").css("visibility", "hidden");
			});
			$("#context-front").on("click", function(){
				vb.board.bringToFront(piece);
				$("#context-menu").css("visibility", "hidden");
			});
			$("#context-static").on("click" , function(){
				vb.board.toggleStatic(piece);
				$("#context-menu").css("visibility", "hidden");
			});
		}
	};

})(VBoard);


$(document).ready(function () {
	VBoard.menu.init();
});