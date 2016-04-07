var VBoard = VBoard || {};
(function (vb) {
	vb.menu = {
		privateZoneColorSelected: [255, 255, 255],

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
			$.getJSON("/static/json/backgroundmap.json", function (data) {
				$.each(data, function(key, value) {
					vb.board.backgroundNameMap[key] = value;
				});
				vb.menu.loadBackgroundOptions();
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
			
			$("#addPrivateZone").on("click", function () {
				$("#add-private-zone-modal").modal();
			});

			$('#private-zone-color-picker').empty().addColorPicker({
				clickCallback: function(c) {
					$("#private-zone-selected-color").velocity({ color: vb.interface.strRGB2HexRGB(c) },{duration: 200});
					vb.menu.privateZoneColorSelected = vb.interface.strRGB2ArrayRGB(c);
				},
				colors: [ '#00ffcc','#FF4351', '#7D79F2', '#1B9AF7', '#A5DE37', '#FEAE1B' , '#ff9999'],
				iterationCallback: function(target,elem,color,iterationNumber) {
      				target.append('&nbsp;&nbsp;');
					elem.html("&nbsp;&nbsp;&nbsp;&nbsp;");
				}
			});

			$("#addChessBoard").on("click", function () {
				vb.content.loadChessGame();
			});

			$("#changeBackground").on("click", function () {
				$("#change-background-modal").modal();
			});

			$("#saveGame").on("click", function () {
				vb.sessionIO.requestSave();
			});

			$("#loadGame").on("click", function () {
				$("#load-game-modal").modal();
			})

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

			$("#submit-upload-piece").click(function () {
				var imageUrl = $("#image-url").val();
				console.log(imageUrl);

				//TODO: check url validity is incomplete
				var img = new Image();
				img.onerror = img.onabort = function() {
					console.log("error while loading image from " + imageUrl);
				};
				img.onload = function() {
					console.log("image loaded successfully from " + imageUrl);
				};
				img.src = imageUrl;

				var data = {
					"icon" : imageUrl,
				};
				vb.sessionIO.addPiece(data);
				$("#add-piece-modal").modal("toggle");
			});

			$("#submit-add-die").click(function () {
				var selectedMax = parseInt($("#add-die-max").val());
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

			$("#submit-add-private-zone").click(function () {
				var selectedWidth = $("#add-private-zone-width").val();
				var selectedHeight = $("#add-private-zone-height").val();

				vb.inputs.prepAddPrivateZone(selectedWidth, selectedHeight, vb.menu.privateZoneColorSelected);

				$("#add-private-zone-modal").modal("toggle");
			});

			$("#submit-change-background").click(function() {
				//TODO: implement session IO change background function
				var selectedBackground = $("#change-background-list").val();
				console.log(selectedBackground);
				var mapEntry = vb.board.backgroundNameMap[selectedBackground];
				console.log(mapEntry);
				var data = mapEntry.icon;
				vb.sessionIO.setBackground(data);
				$("#change-background-modal").modal("toggle");
			});

			$("#submit-load-game").click(function () {
				//vb.sessionIO.requestLoad();
				var f = document.getElementById('fileUpload').files[0];
				var r = new FileReader();
				r.onload = function (e) {
					var contents = e.target.result;
					var boardData = JSON.parse(contents);

					vb.sessionIO.loadBoardState(boardData);
				};
				r.readAsText(f);
				$("#load-game-modal").modal("toggle");
			});

		},

		loadPieceOptions: function () {
			for (var key in vb.board.pieceNameMap) {
				$("#add-piece-list").append( new Option(key, key) );
			}
		},

		loadBackgroundOptions: function () {
			for (var key in vb.board.backgroundNameMap) {
				$("#change-background-list").append( new Option(key, key) );
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
