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
			});
			$.getJSON("/static/json/diemap.json", function (data) {
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
			$("#addDie").on("click", function () {
				$("#add-die-modal").modal();
			});

			$("#addChessBoard").on("click", function () {
				vb.content.loadChessGame();
			});

			$("#quitGame").on("click", function () {
				VBoard.sessionIO.disconnect("clicked on Quit Button")
				$("canvas").hide("fast");
				$("#main-page").show("fast");
				$("#context-menu").css("visibility", "hidden");
			});


			$("#addDeck").on("click", function () {
				vb.content.createDefaultDeck();
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
					"s" : mapEntry.size
				};
				vb.sessionIO.addPiece(data);
				$("#add-piece-modal").modal("toggle");
			});

			$("#submit-add-die").click(function () {
				var selectedMax = $("#add-die-max").val();
				var user = null;
				//TODO: use vb.camera.position.x/y instead of board center
				//var pos = {x:0, y:0};

				//TODO: replace with actual method
				//vb.board.generateNewPiece(selectedName, user, pos);
				var icon = "/static/img/die_face/small_die_face_1.png";

				if(selectedMax > 6) {
					icon = "/static/img/die_face/big_die_face_1.png";
				}

				var data = {
					"icon" : icon,
					"diceData" : {
						"max" : selectedMax,
						"faces" : []
					},
					"s" : 2
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
			$("#context-draw-card").off("click");
			$("#context-shuffle-deck").off("click");

			//only show flip option if piece is a card
			if (piece.isCard) {
				$("#context-flip").show();

				if(piece.numCards > 1) {
					$("#context-shuffle-deck").show();
					$("#context-draw-card").show();
				} else {
					$("#context-shuffle-deck").hide();
					$("#context-draw-card").hide();
				}
			}
			else {
				$("#context-flip").hide();
				$("#context-draw-card").hide();
				$("#context-shuffle-deck").hide();
			}

			//only show roll option if piece is a die
			if (piece.isDie) {
				$("#context-roll").show();
			}
			else {
				$("#context-roll").hide();
			}

			//set new onclick function bindings
			$("#context-delete").on("click", function(){
				//vb.board.remove(piece);
				vb.sessionIO.removePiece(piece.id);
				$("#context-menu").css("visibility", "hidden");
			});
			$("#context-back").on("click", function(){
				//note: this is not sent to other users
				//this should probably be changed or removed
				vb.board.pushToBack(piece);
				$("#context-menu").css("visibility", "hidden");
			});
			$("#context-front").on("click", function(){
				//note: this is not sent to other users
				//this should probably be changed or removed
				vb.board.bringToFront(piece);
				$("#context-menu").css("visibility", "hidden");
			});
			$("#context-static").on("click" , function(){
				//vb.board.toggleStatic(piece);
				vb.sessionIO.toggleStatic(piece.id);
				$("#context-menu").css("visibility", "hidden");
			});
			$("#context-flip").on("click" , function(){
				vb.sessionIO.flipCard(piece.id);
				$("#context-menu").css("visibility", "hidden");
			});
			$("#context-roll").on("click" , function(){
				vb.sessionIO.rollDice(piece.id);
				$("#context-menu").css("visibility", "hidden");
			});
			$("#context-draw-card").on("click" , function(){
				  vb.sessionIO.drawCard(piece.id);
				$("#context-menu").css("visibility", "hidden");
			});
			$("#context-shuffle-deck").on("click" , function(){
				vb.sessionIO.shuffleDeck(piece.id);
				$("#context-menu").css("visibility", "hidden");
			});
		}
	};

})(VBoard);
