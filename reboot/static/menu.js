var VBoard = VBoard || {};
(function (vb) {
	vb.menu = {
		privateZoneColorSelected: null,

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
			$.getJSON("/static/json/chipmap.json", function (data) {
				$.each(data, function(key, value) {
					vb.board.chipNameMap[key] = value;
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

			$("#addNote").on("click", function () {
				$("#add-note-modal").modal();
			});

			$("#addDie").on("click", function () {
				$("#add-die-modal").modal();
			});
			
			$("#addPrivateZone").on("click", function () {
				$("#add-private-zone-modal").modal();
			});
			
			$("#removePrivateZone").on("click", function () {
				vb.inputs.prepRemovePrivateZone();
			});

			$("#addTimer").on("click", function () {
				$("#add-timer-modal").modal();
			});

			$("#addPokerChips").on("click", function () {
				$("#add-poker-chips-modal").modal();
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

			$("#loadPreset").on("click", function () {
				$("#add-game-modal").modal();
			});

			$("#changeBackground").on("click", function () {
				$("#change-background-modal").modal();
			});

			$("#saveGame").on("click", function () {
				vb.sessionIO.requestSave();
			});

			$("#loadGame").on("click", function () {
				if (vb.board.pieces.length > 0) {
					var warning = "Loading a game will remove the current game, you may want to save first";
					if (($("#template-modal").data('bs.modal') || {}).isShown) {
						vb.interface.setTemplateModalAlert(warning);
					}
					else {
						vb.interface.alertModal(warning,0);
					}
				}
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

			$("#submit-add-game").click(function () {
				var selectedName = $("#add-game-list").val();
				
				switch (selectedName) {
					case "chess" : 
						vb.content.loadChessGame();
						break;
					case "checkers" :
						vb.content.loadCheckersGame();
						break;
					case "scrabble" :
						vb.content.loadScrabbleGame();
						break;
					case "risk" :
						vb.content.loadRiskGame();
						break;
					case "parcheesi":
						vb.content.loadParcheesiGame();
						break;
				}

				$("#add-game-modal").modal("toggle");
			});

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

			$("#submit-add-poker-chips").click(function () {
				var selectedAmount = $("#add-chip-amount").val();
				var user = null;
				var numChips = $('#add-chip-num').val();

				var mapEntry = vb.board.chipNameMap[selectedAmount];
				var data = {
					"icon" : mapEntry.icon,
					"s" : mapEntry.size
				};
				for(; numChips > 0; numChips--){
					vb.sessionIO.addPiece(data);
				}
				$("#add-poker-chips-modal").modal("toggle");
			});

			$("#submit-add-note").click(function () {
				var text = $("#add-note").val();
				var size = parseInt($("#add-note-size").val());

				var data = {
					"icon" : "/static/img/note.jpg",
					"s" : 5,
					"noteData" : {
						"text" : text,
						"size" : size
					},				
				};

				vb.sessionIO.addPiece(data);
				$("#add-note-modal").modal("toggle");
			});

			$("#submit-add-timer").click(function () {
				var minutes = parseInt($("#timer-minutes").val());
				var seconds = parseInt($("#timer-seconds").val());
				minutes = minutes * 60;
				var time = minutes + seconds;
				var user = null;

				var data = {
					"timerData" :
					{
						"time" : time,
					},
					"s" : 2.5
				};
				vb.sessionIO.addPiece(data);
				$("#add-timer-modal").modal("toggle");
			});

			$("#submit-upload-piece").click(function () {
				var imageUrl = $("#image-url").val();
				var imageSize = parseInt($("#image-size").val());
				console.log(imageUrl);
				console.log(imageSize);

				var img = new Image();
				img.onerror = img.onabort = function() {
					alert("error while loading image from " + imageUrl);
				};
				img.onload = function() {
					var data = {
						"icon" : imageUrl,
						"s" : imageSize
					};
					vb.sessionIO.addPiece(data);
				};
				img.src = imageUrl;

				$("#add-piece-modal").modal("toggle");
			});

			$("#submit-add-die").click(function () {
				var selectedMax = parseInt($("#add-die-max").val());
				var user = null;
				//TODO: use vb.camera.position.x/y instead of board center
				//var pos = {x:0, y:0};

				//TODO: replace with actual method
				//vb.board.generateNewPiece(selectedName, user, pos);
				var icon = "/static/img/die_face/tiny_die_face_1.png";

				if(selectedMax > 2) {
					icon = "/static/img/die_face/small_die_face_1.png";
				}
				else if(selectedMax > 6) {
					icon = "/static/img/die_face/big_die_face_1.png";
				}

				var data = {
					"icon" : icon,
					"diceData" : {
						"max" : selectedMax,
						"faces" : [],
						"isUserPicker" : false
					},
					"s" : 2
				};
				vb.sessionIO.addPiece(data);
				$("#add-die-modal").modal("toggle");
			});

			$("#addUserPicker").click(function () {
				var selectedMax = Object.keys(vb.users.userList).length;

				//TODO: Need to change the initial icon
				//TODO: if a user joins after the user picker is added then the user picker does not update to include that user
				var icon = "/static/img/die_face/small_die_face_1.png";

				var data = {
					"icon" : icon,
					"diceData" : {
						"max" : selectedMax,
						"faces" : [],
						"isUserPicker" : true
					},
					"s" : 2
				};
				vb.sessionIO.addPiece(data);
			});

			$("#submit-add-private-zone").click(function () {
				if (vb.menu.privateZoneColorSelected == null) {
					var warning = "You must select a color for the private zone";
					if (($("#template-modal").data('bs.modal') || {}).isShown) {
						vb.interface.setTemplateModalAlert(warning);
					}
					else {
						vb.interface.alertModal(warning,0);
					}
					return;
				}

				var selectedWidth = parseFloat($("#add-private-zone-width").val());
				var selectedHeight = parseFloat($("#add-private-zone-height").val());

				vb.inputs.prepAddPrivateZone(selectedWidth, selectedHeight, vb.menu.privateZoneColorSelected);
				vb.menu.privateZoneColorSelected = null;

				$("#add-private-zone-modal").modal("toggle");
			});

			$("#submit-change-background").click(function() {
				//TODO: implement session IO change background function
				var selectedBackground = $("#change-background-list").val();
				var mapEntry = vb.board.backgroundNameMap[selectedBackground];
				var data = mapEntry.icon;
				vb.sessionIO.setBackground(data);
				$("#change-background-modal").modal("toggle");
			});

			$("#submit-load-game").click(function () {
				//vb.sessionIO.requestLoad();
				var f = document.getElementById('fileField').files[0];
				var r = new FileReader();
				r.onload = function (e) {
					var contents = e.target.result;
					var boardData = JSON.parse(contents);

					vb.sessionIO.clearBoard();
					vb.sessionIO.loadBoardState(boardData);
				};
				r.readAsText(f);
				$("#load-game-modal").modal("toggle");
			});

			$("#setGrid").change(function() {
				if($(this).is(":checked")) {
		            vb.board.gridConfig.enabled = true;
		        } else {
		        	vb.board.gridConfig.enabled = false;
		    	}
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

		hideHostOnlyButtons: function () {
			$("#addPrivateZone").hide();
			$("#removePrivateZone").hide();
			$("#loadGame").hide();
		},

		showHostOnlyButtons: function () {
			$("#addPrivateZone").show();
			$("#removePrivateZone").show();
			$("#loadGame").show();
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
			$("#context-start-timer").off("click");
			$("#context-stop-timer").off("click");
			$("#context-flip").off("click");
			$("#context-roll").off("click");
			$("#context-draw-card").off("click");
			$("#context-shuffle-deck").off("click");
			//$("#context-resize").off("click");
			//$("#context-rotate").off("click");

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

			if(piece.isTimer && piece.isRunning){
				$("#context-stop-timer").show();
			}
			else{
				$("#context-stop-timer").hide();
			}
			if(piece.isTimer && !piece.isRunning){
				$("#context-start-timer").show();
			}
			else{				
				$("#context-start-timer").hide();
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
			$("#context-start-timer").on("click", function(){
				vb.sessionIO.startTimer(piece.id);
				$("#context-menu").css("visibility", "hidden");
			});
			$("#context-stop-timer").on("click", function(){
				vb.sessionIO.stopTimer(piece.id);
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
			//$("#context-resize").on("click", function(){
			//	$("#context-menu").css("visibility", "hidden");
			//});
			//$("#context-resize").on("click", function(){
			//	$("#context-menu").css("visibility", "hidden");
			//});
		}
	};

})(VBoard);
