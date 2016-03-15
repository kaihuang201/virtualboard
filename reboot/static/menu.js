var VBoard = VBoard || {};
(function (vb) {
	vb.menu = {
		init: function () {
			//TODO: menu should not be active until we are in a game session
			$.getJSON("/static/json/piecemap.json", function (data) {
				$.each(data, function(key, value) {
					vb.board.pieceNameMap[key] = value;
				});
				vb.menu.loadPieceOptions();
			});$.getJSON("/static/json/cardmap.json", function (data) {
				$.each(data, function(key, value) {
					vb.board.cardNameMap[key] = value;
				});
				vb.menu.loadCardOptions();
			});$.getJSON("/static/json/diemap.json", function (data) {
				$.each(data, function(key, value) {
					vb.board.dieNameMap[key] = value;
				});
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
			$("#addCard").on("click", function () {
				$("#add-card-modal").modal();
			});
			$("#addDie").on("click", function () {
				$("#add-die-modal").modal();
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
					"pos" : [vb.camera.position.x, vb.camera.position.y],
					"icon" : mapEntry.icon,
					"color" : [255, 255, 255],
					"static" : 0,
					"s" : mapEntry.size,
					"r" : vb.camera.rotation.z
				};
				vb.sessionIO.addPiece(data);
				$("#add-piece-modal").modal("toggle");
			});

			$("#submit-add-card").click(function () {
				var selectedName = $("#add-card-list").val();
				var user = null;
				//TODO: use vb.camera.position.x/y instead of board center
				//var pos = {x:0, y:0};

				//TODO: replace with actual method
				//vb.board.generateNewPiece(selectedName, user, pos);
				var mapEntry = vb.board.cardNameMap[selectedName];
				var data = {
					"pos" : [vb.camera.position.x, vb.camera.position.y],
					"icon" : mapEntry.back,
					"front_icon" : mapEntry.front,
					"color" : [255, 255, 255],
					"static" : 0,
					"s" : mapEntry.size,
					"r" : vb.camera.rotation.z
				};
				vb.sessionIO.addPiece(data);
				$("#add-card-modal").modal("toggle");
			});

			$("#submit-add-die").click(function () {
				var selectedMax = $("#add-die-max").val();
				var user = null;
				//TODO: use vb.camera.position.x/y instead of board center
				//var pos = {x:0, y:0};

				//TODO: replace with actual method
				//vb.board.generateNewPiece(selectedName, user, pos);
				var data = {
					"pos" : [vb.camera.position.x, vb.camera.position.y],
					"max_roll" : selectedMax,
					"color" : [255, 255, 255],
					"static" : 0,
					"s" : 2,
					"r" : vb.camera.rotation.z
				};
				vb.sessionIO.addPiece(data);
				$("#add-die-modal").modal("toggle");
			});

		},

		loadPieceOptions: function () {
			for (var key in vb.board.pieceNameMap) {
				$("#add-piece-list").append( new Option(key, key) );
			}
		},

		loadCardOptions: function () {
			for (var key in vb.board.cardNameMap) {
				$("#add-card-list").append( new Option(key, key) );
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
            $("#context-flip").off("click");
            $("#context-roll").off("click");

            //only show flip option if piece is a card
            if (piece instanceof Card) {
                $("#context-flip").show();
            }
            else {
                $("#context-flip").hide();
            }

            //only show roll option if piece is a die
            if (piece instanceof Die) {
                $("#context-roll").show();
            }
            else {
                $("#context-roll").hide();
            }

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
            $("#context-flip").on("click" , function(){

                if (piece instanceof Card) {
                    vb.sessionIO.flipCard(piece.id);
                }
                $("#context-menu").css("visibility", "hidden");
            });
            $("#context-roll").on("click" , function(){

                if (piece instanceof Die) {
                    vb.sessionIO.rollDice(piece.id);
                }
                $("#context-menu").css("visibility", "hidden");
            });
		}
	};

})(VBoard);


$(document).ready(function () {
	VBoard.menu.init();
});