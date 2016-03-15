var VBoard = VBoard || {};
(function (vb) {
	//size of the vertical view plane
	vb.size = 10;

	//max/min/view size should probably be bound to VBoard.board
	vb.maxSize = 55;
	vb.minSize = 3;
	vb.BoardHeight = 50;
	vb.BoardWidth = 50;
	vb.moveHighlightDuration = 500; //milliseconds
	vb.addHighlightDuration = 500; //milliseconds
	vb.predictionTimeout = 500; //delay until we roll back the client sided prediction
	vb.moveTickDuration = 100; //maximum time to hold onto new positional data before sending it
	vb.smoothTransitionDuration = 90; //how many milliseconds to smooth out motion received from the server

	vb.quickStart = function () {
		vb.limboIO.hostGame("bill", [0, 0, 255], "chess deathmatch", "12345");
		vb.quickStarted = true;
	};

	vb.quickJoin = function () {
		//this will only work if the game id of the target game is 0
		//if you have closed and reopened the host game without restarting the tornado server this will not work
		vb.limboIO.joinGame("bob", [0, 255, 0], 0, "12345");
	};

	vb.javascriptInit = function () {
		//networking
		vb.socket = new WebSocket("ws://" + window.location.host + window.location.pathname + "socket");

		vb.socket.onopen = function () {
			//TODO: display some kind of "loading..." animation

			//fetch game list
			vb.limboIO.listGames();
		};
		vb.socket.onmessage = vb.limboIO.messageHandler;
		vb.socket.onclose = function () {
			console.log("rip socket");

			//TODO: display graphical error message, tell user to refresh page
			// alert("socket is closed, please refresh page!");
			vb.interface.alertModal('socket is closed, please refresh page!',1);
			clearInterval(VBoard.interface.autoGameListIntervalID);

		};
	};

	//this function is called when we enter a game session
	vb.launchCanvas = function () {
		vb.simTime = Date.now();
		vb.inputs.initialize();

		vb.renderInit();

		$("#menu").css("visibility", "visible");

		if(vb.quickStarted) {
			vb.sessionIO.loadChessGame();
		}
	};

	vb.interface = {
		// this is for color selected from the interface
		colorSelected: [0,0,0],
		colorLastSelectedStr: '',
		userName: "",
		autoGameListIntervalID: 0,

		// interface initializer
		init: function () {

			// vb.interface.userNamePrompt();



			$("#create-lobby").on("click", function() {
				// $("#main-page").hide("fast");
				VBoard.interface.createLobbyRequest();
			});

			$("#listGames").on("click", function () {
				
				$("#template-modal").modal();

				var listOfLobbies = vb.interface.listLobbiesRequest();


			});

			// vb.interface.colorPickerInit();

			$('#change-username').on('click',function () {
				vb.interface.clearTemplateModalAlert();
				vb.interface.clearTemplateModal();
				vb.interface.userNamePrompt();
				$('#user-nickname').val(VBoard.interface.userName);
			});



			// automatic refresh game list
			VBoard.interface.autoGameListIntervalID = setInterval(function(){VBoard.limboIO.listGames();}, 2000);
			// enable tooltip @ bootstrap
			$('[data-toggle="tooltip"]').tooltip(); 
		},

		colorPickerInit: function () {
			// adapted from
			// http://wanderinghorse.net/computing/javascript/jquery/colorpicker/demo-colorpicker.html
			$('#color-picker').empty().addColorPicker({
				clickCallback: function(c) {
					// $('#ColorSelectionTarget2').css('border-color',c).css('color',c);
					$("#selected-color").css('color',c);
					// $("#selected-color").animate({
					// 	color: "#fff"
					// },1000);
					function strRGB2ArrayRGB(str) {
						var retRGB = str.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
						return [parseInt(retRGB[1],10),parseInt(retRGB[2],10),parseInt(retRGB[3],10)];
					};
					VBoard.interface.colorSelected = strRGB2ArrayRGB(c);
					VBoard.interface.colorLastSelectedStr = c;

					// console.log(VBoard.interface.colorSelected + " <--- test");
				},
				colors: [ '#FF4351', '#7D79F2', '#1B9AF7', '#A5DE37', '#FEAE1B' ],
				iterationCallback: function(target,elem,color,iterationNumber) {
		      			if( iterationNumber < 4 /* colors array is undefined here :( */ ) {
		      				target.append('&nbsp;&nbsp;');
		      			}
		      		elem.css("border","1px solid #dddddd")
		      			.css("padding", "7px")
		      			.css("border-radius", "10px");
					elem.html("&nbsp;&nbsp;&nbsp;&nbsp;");
				}
			});
		},

		// request methods

		userNamePrompt: function () {
			vb.interface.switchToUserNicknameModal();
			$('#template-modal').modal('show');
			$('#template-modal #submit-btn-modal-template').unbind();
			$('#template-modal #submit-btn-modal-template').on("click",function () {
				if ($('#user-nickname').val() != '') {
					VBoard.interface.userName = $('#user-nickname').val();
					$('#change-username').html("Hello " + VBoard.interface.userName +'!');
					$('#template-modal').modal('hide');
					vb.interface.clearTemplateModal();
				} else {
					// alert('Please enter a valid username');
					vb.interface.setTemplateModalAlert('Make sure you put in a valid nickname')
				}
				
				
			});
		},

		joinLobbyRequest: function (lobbyNo, lobbyName) {
			if (VBoard.interface.userName != "") {
				vb.interface.switchToJoinLobbyModal(lobbyName);
				$('#template-modal').modal('show');
				$('#template-modal #submit-btn-modal-template').unbind();
				$('#template-modal #submit-btn-modal-template').on("click",function () {
					var password = $('#lobby-password').val();
					vb.limboIO.joinGame(VBoard.interface.userName,VBoard.interface.colorSelected,lobbyNo,password);
					// $('#template-modal').modal('hide');
					vb.interface.clearTemplateModal();
					// this.colorSelected = [0,0,0];
				});
			} else {
			this.userNamePrompt();
			this.setTemplateModalAlert('Please choose a nickname and try again');
			}
		},



		createLobbyRequest: function () {
			if (VBoard.interface.userName != "") {
				vb.interface.switchToCreateLobbyModal();
				$('#template-modal').modal('show');
				$('#template-modal #submit-btn-modal-template').unbind();
				$('#template-modal #submit-btn-modal-template').on("click",function () {
					var gameName = $('#lobby-name').val();
					var password = $('#lobby-password').val();
					vb.limboIO.hostGame(VBoard.interface.userName,VBoard.interface.colorSelected,gameName,password);
					// console.log(VBoard.interface.userName+ VBoard.interface.colorSelected + gameName + password);
					// $('#template-modal').modal('hide');
					vb.interface.clearTemplateModal();
					// this.colorSelected = [0,0,0];
				});
			} else {
				this.userNamePrompt();
				this.setTemplateModalAlert('Please choose a nickname and try again');
			}

			
			
			
		},

		

		listLobbiesRequest: function () {
			vb.limboIO.listGames();
		},

		leaveLobbyRequest: function () {
			vb.sessionIO.disconnect();
		},

		// returned msg methods
		// TODO: most of them
		showListGames: function (listOfGames) {
			// console.log("list all games");
			// console.log(JSON.stringify(listOfGames));
			if (listOfGames.length != 0) {
				$("#lobby-list").empty();
				for (var i = listOfGames.length - 1; i >= 0; i--) {
					var lobbyID = listOfGames[i]["id"];
					var lobbyName = listOfGames[i]["name"];
					var singleLobby = '<a id="lobby-' + lobbyID.toString() + '" class="list-group-item"><span class="badge badge-default pull-right">' + listOfGames[i]["players"] + '</span>' + lobbyName + '</a>'
					$("#lobby-list").append(singleLobby);
					var currentLobby = $("#lobby-" + lobbyID.toString());
					currentLobby.unbind();
					currentLobby.on("click",function() {vb.interface.joinLobbyRequest(lobbyID,lobbyName);});
				}
			} else {
				$("#lobby-list").empty();
				$("#lobby-list").append('<a id="retry-btn" class="list-group-item">No Game Found...</a>');
				$('#retry-btn').unbind();
				// $('#retry-btn').on('click',function() {vb.interface.listLobbiesRequest();})
			}
			

		},


		// Modal operation functions
		switchToGameMode: function () {
			$("#main-page").hide("fast");
			$('#template-modal').modal('hide');

			// stop lobby list refreshing
			clearInterval(VBoard.interface.autoGameListIntervalID);
		},

		switchToCreateLobbyModal: function () {
			vb.interface.clearTemplateModalAlert();
			$('#modal-template-title').html('Create A Lobby');
			$('#modal-template-content').html('<div class="form-group"> \
									<label for="color-picker" class="form-control-label">Choose <span id="selected-color">Your Color</span>:</label> \
									<div id="color-picker" style="padding-top: 5px;"></div>\
								</div>\
								<div class="input-group">\
									<input type="text" class="form-control" placeholder="name your game..." id="lobby-name">\
										<span class="input-group-btn">\
										<button class="btn btn-default" type="button" id="random-gamename"><span class="glyphicon glyphicon-refresh" aria-hidden="true"></span></button>\
										</span>\
								</div>\
								<div class="form-group">\
									<input type="password" class="form-control" id="lobby-password" placeholder="Password">\
								</div>');
			$('#random-gamename').unbind().on('click',function(){$('#lobby-name').val(generate_game_name());});
			$('#template-modal #submit-btn-modal-template').show().html('Create');
			$("#selected-color").css('color',this.colorLastSelectedStr);
			vb.interface.colorPickerInit();
		},

		switchToJoinLobbyModal: function (lobbyName) {
			vb.interface.clearTemplateModalAlert();
			$('#modal-template-title').html('Join 『' + lobbyName + '』');
			$('#modal-template-content').html('<div class="form-group"> \
									<label for="color-picker" class="form-control-label">Choose <span id="selected-color">Your Color</span>:</label> \
									<div id="color-picker" style="padding-top: 5px;"></div>\
								</div>\
								<div class="form-group">\
									<label for="lobby-password" class="form-control-label">Game Password:</label>\
									<input type="password" class="form-control" id="lobby-password">\
								</div>');
			$('#template-modal #submit-btn-modal-template').show().html('Join');
			$("#selected-color").css('color',this.colorLastSelectedStr);
			vb.interface.colorPickerInit();
		},

		switchToUserNicknameModal: function () {
			vb.interface.clearTemplateModalAlert();
			$('#modal-template-title').html('Pick a Nickname:');

			$('#modal-template-content').html('<div class="input-group">\
										<input type="text" class="form-control" placeholder="Your nickname..." id="user-nickname">\
										<span class="input-group-btn">\
										<button class="btn btn-default" type="button" id="random-nickname"><span class="glyphicon glyphicon-refresh" aria-hidden="true"></span></button>\
										</span>\
										</div>');

			$('#random-nickname').unbind().on('click',function(){$('#user-nickname').val(generate_game_name());});
			// $('#user-nickname').val("test");
			$('#template-modal #submit-btn-modal-template').show().html('Confirm');
		},

		clearTemplateModal: function () {
			$('#modal-template-title').html("");
			$('#modal-template-content').html('');
		},

		setTemplateModalAlert: function (alertText) {
			$("#model-template-alert").html('<div class="alert alert-danger" role="alert">\
									<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span> '+ alertText + '\
								</div>');
		},

		clearTemplateModalAlert: function () {
			$("#model-template-alert").html('');
		},

		alertModal: function (alertText,automaticRefresh) {
			function sleep(milliseconds) {
				var start = new Date().getTime();
				for (var i = 0; i < 1e7; i++) {
					if ((new Date().getTime() - start) > milliseconds){
						break;
					}
				}
			};
			vb.interface.clearTemplateModal();
			$('#submit-btn-modal-template').hide();
			$('#modal-template-title').html("Opps!");
			$('#template-modal').modal('show');
			if (!automaticRefresh) {
				vb.interface.setTemplateModalAlert(alertText);
			} else {
				var count = 10;
				vb.interface.setTemplateModalAlert(alertText + ' (Reload in <span id="count-down">'+ count + '</span> seconds)');
				
				
				setInterval(function(){
				      $("#count-down").html((--count).toString());
				      if(count == 0) location.reload();
				   }, 1000);
			}
			
			
			
		},

		getRandomName: function () {
			var nameList = ['Hippo','Fox','Frog','Cat','Sloth','Bunny','Pikachu','Ant','Snake','Dog','Meow','Rat','ET'];

			var randomNum = Math.floor((Math.random() * nameList.length));
			return nameList[randomNum];
		}

	};

	vb.board = {
		//members
		pieces: [], //ordered list
					//we may want to keep separate lists for static and non-static pieces
					//or we can just not push static pieces to the back

		pieceHash: {},	//unordered hash map of pieces
						//maps from piece ids to piece objects

		//a map from private zone id's to private zone objects
		privateZones: {},

		//this should probably be fetched as a separate file
		pieceNameMap: {},
		cardNameMap: {},
		dieNameMap: {},

		selectedPieces: [],

		background: "",

		//methods

		//adds a new piece to the front of the board
		//should only be called by the generateNewPiece() method
		add: function (piece) {
			this.pieces.push(piece);
			this.pieceHash[piece.id] = piece;
			var z = this.getZIndex(this.pieces.length-1);
			piece.mesh.position.z = z;
		},

		ourIndexOf: function (piece) {
			for(var i = 0; i < this.pieces.length; i++) {
				if(this.pieces[i].id == piece.id) {
					return i;
				}
			}
			return -1;
		},

		//function to calculate z index given a position in the pieces array
		getZIndex: function (index) {
			return 1 + (10/(0.2*index + 1));
		},

		//takes JSON formatted data from web handler
		removePiece: function (pieceData) {
			var piece = this.pieceHash[pieceData["piece"]];
			this.remove(piece);
		},

		//removes a piece from the board
		remove: function (piece) {
			//we should call bringToFront instead of doing this probably
			var index = this.ourIndexOf(piece);
			for(var i = index; i < this.pieces.length-1; i++) {
				this.pieces[i] = this.pieces[i+1];
				this.pieces[i].mesh.position.z = this.getZIndex(i);
			}

			//TODO: disable highlight on piece if it exists
			clearTimeout(piece.highlightTimeout);
			clearTimeout(piece.predictTimeout);
			vb.sessionIO.moveBuffer.remove(piece.id);

			this.pieces.pop();
			delete this.pieceHash[piece.id];
			piece.mesh.dispose();
		},

		//moves a piece to the back of the board (highest z index)
		pushToBack: function (piece) {
			var index = this.ourIndexOf(piece);

			for(var i = index; i > 0; i--) {
				this.pieces[i] = this.pieces[i-1];
				this.pieces[i].mesh.position.z = this.getZIndex(i);
			}
			this.pieces[0] = piece;
			piece.mesh.position.z = this.getZIndex(0);
		},

		//moves a piece to the front of the board (lowest z index)
		bringToFront: function (piece) {
			var index = this.ourIndexOf(piece);
			for(var i = index; i < this.pieces.length-1; i++) {
				this.pieces[i] = this.pieces[i+1];
				this.pieces[i].mesh.position.z = this.getZIndex(i);
			}
			this.pieces[this.pieces.length-1] = piece;
			piece.mesh.position.z = this.getZIndex(this.pieces.length-1);
		},

		//toggles whether a piece should be static or not
		toggleStatic: function (piece) {
			piece.static = !piece.static;
			//if(piece.static){
				//TODO: should not push new static element behind existing static elements
			//	this.pushToBack(piece);
			// }
		},

		//called by web socket handler upon receiving an update
		transformPiece: function (pieceData) {
			var piece = this.pieceHash[pieceData["piece"]];
			var user = vb.users.userList[pieceData["user"]];

			this.highlightPiece(piece, user.color, vb.moveHighlightDuration);

			if(pieceData.hasOwnProperty("color")) {
				piece.mesh.material.diffuseColor = new BABYLON.Color3(pieceData["color"][0], pieceData["color"][1], pieceData["color"][2]);
			}

			if(pieceData.hasOwnProperty("pos")) {
				this.bringToFront(piece);
				piece.position.x = pieceData["pos"][0];
				piece.position.y = pieceData["pos"][1];

				if(!user.isLocal) {
					//TODO: remove piece from selectedPieces if it exists
				}

				if(piece.predictTimeout === null) {
					//if we have no expectation for this piece's position
					//then we should update the mesh's position immediately, regardless of who moved it

					//piece.mesh.position.x = pieceData["pos"][0];
					//piece.mesh.position.y = pieceData["pos"][1];
					this.smoothTransition(piece); //, pieceData["pos"][0], pieceData["pos"][1]);
				} else {
					clearTimeout(piece.predictTimeout);

					if(!user.isLocal) {
						//if we have an expectation for this piece's position but another user has moved it
						//then we need to throw out our predictions
						piece.predictTimeout = null;
						piece.mesh.position.x = pieceData["pos"][0];
						piece.mesh.position.y = pieceData["pos"][1];
						//this.smoothTransition(piece); //, pieceData["pos"][0], pieceData["pos"][1]);
					} else {
						//hopefully this motion is part of what we have already predicted

						//check to see if this is the end of the motion
						//TODO: instead of looking directly at piece.mesh.position, we should instead maybe
						//		have some secondary variable set on piece.  That way we can easily add
						//		a smoothing function for setting the value of piece.mesh.position
						//nvm who cares
						if(piece.position.x == piece.mesh.position.x && piece.position.y == piece.mesh.position.y) {
							piece.predictTimeout = null;
						} else {
							//all we need to do is extend the timeout
							piece.predictTimeout = setTimeout(function () {
								vb.board.undoPrediction(piece);
								piece.predictTimeout = null;
							}, vb.predictionTimeout);
						}
					}
				}
			}

			if(pieceData.hasOwnProperty("r")) {
				piece.mesh.rotation.z = pieceData.r;
			}

			if(pieceData.hasOwnProperty("s")) {
				piece.mesh.scaling.x = pieceData.s;
				piece.mesh.scaling.y = pieceData.s;
			}
		},

		smoothedPieces: {},

		smoothTransition: function (piece, x, y) {
			this.smoothedPieces[piece.id] = {
				"time" : 0,
				"oldx" : piece.mesh.position.x,
				"oldy" : piece.mesh.position.y
			};
		},

		//called once per frame
		//updates the positions of pieces that are currently having their motions smoothed
		movePieces: function (dt) {
			for(id in this.smoothedPieces) {
				if(this.smoothedPieces.hasOwnProperty(id)) {
					var moveInfo = this.smoothedPieces[id];
					var piece = this.pieceHash[id];
					moveInfo.time += dt;

					if(moveInfo.time >= vb.smoothTransitionDuration) {
						piece.mesh.position.x = piece.position.x;
						piece.mesh.position.y = piece.position.y;

						//according to the internet its ok to delete this during enumeration
						delete this.smoothedPieces[id];
					} else {
						var progress = moveInfo.time / vb.smoothTransitionDuration;
						var interpX = (1.0 - progress)*moveInfo.oldx + progress*piece.position.x;
						var interpY = (1.0 - progress)*moveInfo.oldy + progress*piece.position.y;
						piece.mesh.position.x = interpX;
						piece.mesh.position.y = interpY;
					}
				}
			}
		},

		//takes a piece object from the board.pieces array
		//color is a BABYLON.Color3, not an array of length 3
		highlightPiece: function (piece, color, duration) {
			clearTimeout(piece.highlightTimeout);

			//var babylonColor = new BABYLON.Color3(color[0]/255, color[1]/255, color[2]/255);

			piece.mesh.overlayColor = color;
			piece.mesh.renderOverlay = true;
			piece.highlightTimeout = setTimeout(function () {
				piece.mesh.renderOverlay = false;
				piece.highlightTimeout = null;
			}, duration);
		},

		//takes JSON formatted data from socket handler
		generateNewPiece: function (pieceData) {
			var piece;
			if (pieceData.front_icon){
				piece = new Card(pieceData);
			}
			else if (pieceData.max_roll) {
				piece = new Die(pieceData);
			}
			else {
				piece = new Piece(pieceData);
			}

			this.add(piece);

			if(pieceData.hasOwnProperty("user")) {
				var user = vb.users.userList[pieceData.user];
				this.highlightPiece(piece, user.color, vb.addHighlightDuration);
			}
			return piece;
		},

		removeSelectedPieces: function () {
			if(this.selectedPieces.length > 0) {
				//for(index in this.selectedPieces) {
					//this.selectedPieces[index].pickedUp = false;
					//this.selectedPieces[index].user = vb.users.getNone();

					//todo: disable the highlight
				// }
				this.selectedPieces = [];
			}
		},

		//pieces should be in order from bottom element to top element
		//that way the order won't get jumbled as the pieces move
		setSelectedPieces: function (pieces) {
			//maybe this should be called first?
			this.removeSelectedPieces();

			this.selectedPieces = pieces;
			//piece.pickedUp = true;
			//piece.user = vb.users.getLocal();
			//todo: enable the highlight
		},

		//pieces in this.selectedPieces should be ordered based on depth
		//we cannot simply insert this piece at the end of the array
		addSelectedPiece: function (piece) {
			//TODO
			//needs to make sure that piece is not already contained in this.selectedPieces
		},

		undoPrediction: function (piece) {
			//set a timeout to revert back to last confirmed server position in case of desync
			piece.mesh.position.x = piece.position.x;
			piece.mesh.position.y = piece.position.y;
		},

		//triggered by network call
		clearBoard: function () {
			while(this.pieces.length > 0) {
				this.remove(this.pieces[this.pieces.length-1]);
			}
		},

		getCenter: function () {
			return new BABYLON.Vector2(0, 0);
		},

		//TODO: this seems to break when opening/closing the developer console
		screenToGameSpace: function (position) {
			//console.log("input pos: " + position.x + " " + position.y);
			//screen space
			//also equals to the camera coordinates

			//apparently canvas.height does not update when you open the developer console
			var halfWidth = window.innerWidth / 2; //vb.canvas.width / 2;
			var halfHeight = window.innerHeight / 2; //vb.canvas.height / 2;

			//game space
			var cameraX = vb.camera.position.x;
			var cameraY = vb.camera.position.y;

			//screen space
			var screenDX = (position.x - halfWidth);
			var screenDY = (position.y - halfHeight);

			var ratio = window.innerWidth / window.innerHeight;
			var size = vb.size;

			var upX = vb.camera.upVector.x;
			var upY = vb.camera.upVector.y;
			var heightRatio = -size / halfHeight;
			var widthRatio = ratio*size / halfWidth;

			//game space
			var dx = (screenDX*upY - screenDY*upX)*widthRatio;
			var dy = (screenDY*upY + screenDX*upX)*heightRatio;
			var totalX = cameraX + dx;
			var totalY = cameraY + dy;

			//console.log("   output pos: " + totalX + " " + totalY);
			return new BABYLON.Vector2(totalX, totalY);
		},

		setBackground: function (icon) {
			//TODO: set background
		},

		loadBoardData: function (boardData) {
			this.setBackground(boardData["background"]);

			var pieces = boardData["pieces"];

			//TODO: it turns out for ... in does not guarantee any particular order, so this should be rewritten
			for(index in pieces) {
				var pieceData = pieces[index];
				this.generateNewPiece(pieceData);
			}

			//TODO: private zones
		}
	};

	vb.users = {
		//members
		local: null,
		host: null,
		userList: {},	//unordered
						//maps ids to user objects


		//constructor for internal object
		//User: function (id, name, color, isLocal, isHost) {
		//	//the downside to this construction is that accessing vb.user's methods is not as clean
		//	this.id = id;
		//	this.name = name;
		//	this.color = color;
		//	this.isLocal = isLocal;
		//	this.isHost = isHost;
		//	this.ping = -1;
		// },

		//methods
		add: function (user) {
			this.userList[user.id] = user;
		},

		remove: function (user) {
			//var index = this.userList.indexOf(user);

			//this.userList[index] = this.userList[this.userList.length-1];
			//this.userList.pop();
			delete this.userList[user.id];
		},

		removeUser: function (userData) {
			var id = userData["user"];
			var user = this.userList[id];
			this.remove(user);
		},

		//to do: actual implementation
		setLocal: function (user) {
			this.local = user;
		},

		getLocal: function () {
			return this.local;
		},

		getNone: function () {
			return null;
		},

		getHost: function () {
			return this.host;
		},

		changeHost: function (id) {
			var newHost = this.userList[id];
			this.userList[this.host.id].isHost = false;
			newHost.isHost = true;
			this.host = newHost;

			//TODO: message to local user?
			//probably not in this function
		},

		createNewUser: function (userData) {
			var id = userData["user"];
			var name = userData["name"];
			var color = new BABYLON.Color3(	userData["color"][0]/255,
											userData["color"][1]/255,
											userData["color"][2]/255 );
			var isLocal = userData["local"] == 1;
			var isHost = userData["host"] == 1;

			//var user = new this.User(id, name, color, isLocal, isHost);
			var user = {
				"id" : id,
				"name" : name,
				"color" : color,
				"isLocal" : isLocal,
				"isHost" : isHost,
				"ping" : -1
			};

			if(isLocal) {
				this.local = user;
			}

			if(isHost) {
				this.host = user;
			}
			this.add(user);
		}
	};

	vb.inputs = {
		//to do: separate system from polling buttons (wasd, etc) versus event buttons (backspace, space, etc)
		keysPressed: [],

		initialize: function () {
			window.addEventListener("resize", function () {
				vb.canvas.height = window.innerHeight;
				vb.canvas.width = window.innerWidth;
				vb.setCameraPerspective()
			});

			window.addEventListener("keydown", function (evt) {
				vb.inputs.onKeyDown(evt.keyCode);
				//if(!evt.metaKey) {
				//	evt.preventDefault();
				// }
			});

			//hide context menu when clicking on the canvas
			$("#canvas").click(function(){
				$("#context-menu").css("visibility", "hidden");
			});

			window.addEventListener("keyup", function (evt) {
				vb.inputs.onKeyUp(evt.keyCode);
			});

			window.addEventListener("mousewheel", function (evt) {
				vb.inputs.onScroll(Math.max(-1, Math.min(1, (evt.wheelDelta))));
			});

			//silly firefox doing firefox things
			window.addEventListener("DOMMouseScroll", function (evt) {
				vb.inputs.onScroll(Math.max(-1, Math.min(1, (-evt.detail))));
			});

			window.addEventListener("mouseup", function (evt) {
				vb.board.removeSelectedPieces();
			});

			window.addEventListener("mousemove", function (evt) {
				if(vb.board.selectedPieces.length > 0) {
					var mousePos = vb.board.screenToGameSpace(new BABYLON.Vector2(vb.scene.pointerX, vb.scene.pointerY));
					vb.inputs.onDrag(mousePos.x - vb.lastDragX, mousePos.y - vb.lastDragY);
					vb.lastDragX = mousePos.x;
					vb.lastDragY = mousePos.y;
				}
			});
		},

		onKeyDown: function (key) {
			//console.log("NEW KEY: " + key);
			if(this.keysPressed.indexOf(key) == -1) {
				//console.log("sanity check: " + key);
				this.keysPressed.push(key);
			}
		},

		onKeyUp: function (key) {
			var index = this.keysPressed.indexOf(key);
			this.keysPressed.splice(index, 1);
		},

		onScroll: function (delta) {
			//console.log(delta);
			//note: there is definitely some way for this to get messed up after the board has been manipulated to some extent
			//it seems to have something to do with opening/closing the developer console

			var mousePos = vb.board.screenToGameSpace({
				x: vb.scene.pointerX,
				y: vb.scene.pointerY
			});
			this.adjustZoom(mousePos, delta);
		},

		adjustZoom: function (focusPos, delta) {
			//TODO: remove magic numbers
			var oldCameraPos = vb.camera.position;
			var dx = focusPos.x - oldCameraPos.x;
			var dy = focusPos.y - oldCameraPos.y;

			if (vb.size < vb.maxSize && delta < 0) { // should be able to zoom out
				vb.size /= 0.9;
				dx /= 0.9;
				dy /= 0.9;
				vb.camera.position.x = focusPos.x - dx;
				vb.camera.position.y = focusPos.y - dy;
			} else if (vb.size > vb.minSize && delta > 0) { // should be able to zoom in 
				vb.size *= 0.9;
				dx *= 0.9;
				dy *= 0.9;
				vb.camera.position.x = focusPos.x - dx;
				vb.camera.position.y = focusPos.y - dy;
			}
			vb.setCameraPerspective();
		},

		//we should use the data from the mouse event rather than scene.pointer
		onDrag: function (dx, dy) {
			var ids = [];
			var xs = [];
			var ys = [];

			for(var index = 0; index < vb.board.selectedPieces.length; index++) {
				var piece = vb.board.selectedPieces[index];
				clearTimeout(piece.predictTimeout);

				//we should use a difference in mouse position instead of having the piece's center snap to the mouse
				//if a corner is clicked and dragged, then the mouse should stay relative to that corner
				//var newPos = this.screenToGameSpace(new BABYLON.Vector2(vb.scene.pointerX, vb.scene.pointerY));

				//static pieces should simply not beadded to selectedPieces in the first place
				var newX = piece.mesh.position.x + dx;
				var newY = piece.mesh.position.y + dy;

				if(newX > vb.boardWidth) {
					newX = vb.boardWidth;
				}

				if(newX < -vb.boardWidth) {
					newX = -vb.boardWidth;
				}

				if(newY > vb.boardHeight) {
					newY = vb.boardHeight;
				}

				if(newY < -vb.boardHeight) {
					newY = -vb.boardHeight;
				}

				piece.mesh.position.x = newX;
				piece.mesh.position.y = newY;

				//todo: send one update for all pieces rather than call this for each selected piece
				//vb.sessionIO.movePiece(piece.id, newX, newY);
				ids.push(piece.id);
				xs.push(newX);
				ys.push(newY);

				piece.predictTimeout = setTimeout(function () {
					vb.board.undoPrediction(piece);
					piece.predictTimeout = null;
				}, vb.predictionTimeout);
				//todo: set timeout
				//more TODO: keep track of where piece is released
				//then override the local ignore when that final position arrives
				//this fixes a race condition where 2 users move the same piece at the same time
			}
			vb.sessionIO.movePiece(ids, xs, ys);
		},

		processInputs: function (elapsed) {
			//console.log("ELAPSED: " + elapsed);
			var inertia = 2000;
			var up = vb.camera.upVector;
			var dist = (elapsed / inertia) * vb.size

			for(var index = 0; index < this.keysPressed.length; index++) {
				//to do: move these to their own functions
				switch(this.keysPressed[index]) {
					case 87: //w
					case 38: //up
						vb.camera.position.y += dist * up.y;
						vb.camera.position.x += dist * up.x;
						break;
					case 83: //s
					case 40: //down
						vb.camera.position.y -= dist * up.y;
						vb.camera.position.x -= dist * up.x;
						break;
					case 68: //d
					case 39: //right
						vb.camera.position.y -= dist * up.x;
						vb.camera.position.x += dist * up.y;
						break;
					case 65: //a
					case 37: //left
						vb.camera.position.y += dist * up.x;
						vb.camera.position.x -= dist * up.y;
						break;
					case 81: //q
						//warning: breaks camera panning and screenToGameSpace
						var upX = up.x*Math.cos(-elapsed/inertia) - up.y * Math.sin(-elapsed/inertia);
						var upY = up.x*Math.sin(-elapsed/inertia) + up.y * Math.cos(-elapsed/inertia);
						vb.camera.upVector = new BABYLON.Vector3(upX, upY, 0);
						break;
					case 69: //e
						var upX = up.x*Math.cos(elapsed/inertia) - up.y * Math.sin(elapsed/inertia);
						var upY = up.x*Math.sin(elapsed/inertia) + up.y * Math.cos(elapsed/inertia);
						vb.camera.upVector = new BABYLON.Vector3(upX, upY, 0);
						break;
					case 8: //backspace
						//resets the camera to default
						//or at least it would in theory if backspace didn't also go back a page
						vb.camera.position.x = 0;
						vb.camera.position.y = 0;
						vb.camera.upVector.x = 0;
						vb.camera.upVector.y = 1;
						vb.size = 10; //may need to be updated in the future
						vb.setCameraPerspective();
						break;
				}
			}
		},
	};

	//socket IO before user is in a game
	vb.limboIO = {
		send: function (data) {
			vb.socket.send(JSON.stringify(data));
		},

		//the following functions are called by the client to send queries to the server

		listGames: function () {
			var data = {
				"type" : "listGames"
			};
			this.send(data);
		},

		joinGame: function (userName, userColor, gameID, password) {
			var data = {
				"type" : "initJoin",
				"data" : {
					"name" : userName,
					"color" : userColor,
					"gameID" : gameID,
					"password" : password
				}
			};
			this.send(data);
		},

		hostGame: function (userName, userColor, gameName, password) {
			var data = {
				"type" : "initHost",
				"data" : {
					"name" : userName,
					"color" : userColor,
					"gameName" : gameName,
					"password" : password
				}
			};
			this.send(data);
		},

		//handle a response from the server
		messageHandler: function (event) {
			console.log("websocket server response: " + event.data);
			var data = JSON.parse(event.data);

			//TODO: most of this stuff
			switch(data["type"]) {
				case "pong":
					break;
				case "error":
					vb.interface.alertModal(data["data"]["msg"],1);
					break;
				case "initSuccess":
					vb.interface.switchToGameMode();

					console.log("Coming to you live from " + data["data"]["gameName"]);
					var users = data["data"]["users"];

					//initialize user list
					for(var index in users) {
						var userData = users[index];
						vb.users.createNewUser(userData);
					}

					//switch from lobby state to game state
					vb.socket.onmessage = vb.sessionIO.messageHandler;
					vb.launchCanvas();

					//initialize board data
					var boardData = data["data"]["board"];
					vb.board.loadBoardData(boardData);

					
					break;
				case "initFailure":
					vb.interface.alertModal(data["data"]["msg"],1);
					break;
				case "listGames":
					vb.interface.showListGames(data["data"]);
					break;
				default:
					console.log("unhandled server message");
			}
		}
	};

	//socket IO while in a game session
	vb.sessionIO = {
		send: function (data) {
			vb.socket.send(JSON.stringify(data, function(key, value) {
				if(value.toFixed) {
					return Number(value.toFixed(3));
				} else {
					return value;
				}
			}));
		},

		//functions used to send queries to the server
		sendChatMessage: function (message) {
			if(message.constructor === Array) {
				var chatData = [];

				for(var i=0; i<message.length; i++) {
					chatData.push({
						"msg" : message[i]
					});
				}
			} else {
				var chatData = [
					{
						"msg" : message
					}
				];
			}
			var data = {
				"type" : "chat",
				"data" : chatData
			};
			this.send(data);
		},

		sendBeacon: function (x, y) {
			if(x.constructor === Array) {
				var beaconData = [];

				for(var i=0; i<x.length; i++) {
					beaconData.push({
						"pos" : [x[i], y[i]]
					});
				}
			} else {
				var beaconData = [
					{
						"pos" : [x[i], y[i]]
					}
				];
			}
			var data = {
				"type" : "beacon",
				"data" : beaconData
			};
			this.send(data);
		},

		disconnect: function (reason) {
			var data = {
				"type" : "disconnect",
				"data" : {
					"msg" : reason
				}
			};
			this.send(data);
		},

		getClientList: function () {
			var data = {
				"type" : "listClients"
			};
			this.send(data);
		},

		//input data is an object that maps properties to values (see pieceData for an example)
		addPiece: function (inputData) {
			if(inputData.constructor !== Array) {
				//turn single input into an array instead of dealing with two cases separately
				inputData = [inputData];
			}
			var pieces = [];

			for(var i=0; i<inputData.length; i++) {
				var inputEntry = inputData[i];

				//default values
				var pieceData = {
					"icon" : "/static/img/crown.png",
					"pos" : [0, 0],
					"r" : 0,
					"s" : 1,
					"static" : 0
				};

				//update with input values
				for(var property in inputEntry) {
					if(inputEntry.hasOwnProperty(property)) {
						pieceData[property] = inputEntry[property];
					}
				}
				pieces.push(pieceData);
			}

			var data = {
				"type" : "pieceAdd",
				"data" : pieces
			};
			this.send(data);
		},

		//takes an array of integers representing piece ids
		removePiece: function (id) {
			if(id.constructor === Array) {
				var pieceData = [];

				for(var i=0; i<id.length; i++) {
					pieceData.push({
						"piece" : id[i]
					});
				}
			} else {
				var pieceData = [
					{
						"piece" : id
					}
				];
			}
			var data = {
				"type" : "pieceRemove",
				"data" : pieceData
			};
			this.send(data);
		},

		setBackground: function (icon) {
			var data = {
				"type" : "changeBackground",
				"data" : {
					"icon" : icon
				}
			};
			this.send(data);
		},

		//linked list data structure with a hash table for constant time accessing
		//it is important to keep track of the order in which things were added to the buffer
		//and things that get updated need to be pushed to the back of processing order
		moveBuffer : {
			head : null,
			tail : null,
			listMap : {},

			flushTimeout : null,

			add: function (id, x, y) {
				this.remove(id);

				//add to end
				this.listMap[id] = {
					"prev" : this.tail,
					"next" : null,
					"pos" : [x, y],
					"id" : id
				};

				if(this.tail !== null) {
					this.tail.next = this.listMap[id];
				} else if(this.head === null) {
					this.head = this.listMap[id];
				}
				this.tail = this.listMap[id];
			},

			remove: function (id) {
				if(this.listMap.hasOwnProperty(id)) {
					var prev = this.listMap[id].next;
					var next = this.listMap[id].prev;

					if(prev === null) {
						this.head = next;
					} else {
						prev.next = next;
					}

					if(next === null) {
						this.tail = prev;
					} else {
						next.prev = prev;
					}
					delete this.listMap[id];
				}
			},

			hasEntries: function () {
				return this.head !== null;
			},

			flush: function () {
				var piece = this.head;
				var data = [];

				while(piece !== null) {
					data.push({
						"p" : piece.id,
						"pos" : piece.pos
					});
					piece = piece.next;
				}
				this.head = null;
				this.tail = null;
				this.listMap = {};
				return data;
			}
		},

		//all of the following should send a pieceTransform message
		movePiece: function (id, x, y) {
			if(id.constructor !== Array) {
				this.moveBuffer.add(id, x, y);
			} else {
				for(var i=0; i<id.length; i++) {
					this.moveBuffer.add(id[i], x[i], y[i]);
				}
			}

			if(this.moveBuffer.flushTimeout === null) {
				//we can send immediately
				this.endMoveTimeout();
			}
		},

		endMoveTimeout: function () {
			clearTimeout(this.moveBuffer.flushTimeout);

			if(this.moveBuffer.hasEntries()) {
				var pieceData = this.moveBuffer.flush();

				var data = {
					"type" : "pt",
					"data" : pieceData
				};
				this.send(data);
				this.moveBuffer.flushTimeout = setTimeout(function () {
					vb.sessionIO.endMoveTimeout();
				}, vb.moveTickDuration);
			} else {
				this.moveBuffer.flushTimeout = null;
			}
		},

		//TODO: implement

		rotatePiece: function (id, angle) {
			if(id.constructor === Array) {
				var pieceData = [];

				for(var i=0; i<ids.length; i++) {
					pieceData.push({
						"piece" : id[i],
						"r" : angle[i]
					});
				}
			} else {
				var pieceData = [
					{
						"piece" : id,
						"r" : angle
					}
				];
			}
			var data = {
				"type" : "pieceTransform",
				"data" : pieceData
			};
			this.send(data);
		},

		resizePiece: function (id, size) {
			if(id.constructor === Array) {
				var pieceData = [];

				for(var i=0; i<ids.length; i++) {
					pieceData.push({
						"piece" : id[i],
						"s" : size[i]
					});
				}
			} else {
				var pieceData = [
					{
						"piece" : id,
						"s" : size
					}
				];
			}
			var data = {
				"type" : "pieceTransform",
				"data" : pieceData
			};
			this.send(data);
		},

		//an entry in color is an array of length 3
		recolorPiece: function (id, color) {
			if(id.constructor === Array) {
				var pieceData = [];

				for(var i=0; i<id.length; i++) {
					pieceData.push({
						"piece" : id[i],
						"color" : color[i]
					});
				}
			} else {
				var pieceData = [
					{
						"piece" : id,
						"color" : color,
					}
				];
			}
			var data = {
				"type" : "pieceTransform",
				"data" : pieceData
			};
			this.send(data);
		},

		//can take either a single integer, or an array of ids
		toggleStatic: function (id) {
			if(id.constructor === Array) {
				var pieceData = [];

				for(var i=0; i<id.length; i++) {
					pieceData.push({
						"piece" : id[i],
						"static" : vb.board.pieceHash[id[i]].static ? 1 : 0
					});
				}
			} else {
				var pieceData = [
					{
						"piece" : id,
						"static" : vb.board.pieceHash[id].static ? 1 : 0
					}
				];
			}
			var data = {
				"type" : "pieceTransform",
				"data" : pieceData
			};
			this.send(data);
		},

		//interacting with special pieces

		rollDice: function (id) {
			if(id.constructor === Array) {
				var pieceData = [];

				for(var i=0; i<id.length; i++) {
					pieceData.push({
						"piece" : id[i]
					});
				}
			} else {
				var pieceData = [
					{
						"piece" : id
					}
				];
			}
			var data = {
				"type" : "rollDice",
				"data" : pieceData
			};
			this.send(data);
		},

		flipCard: function (id) {
			if(id.constructor === Array) {
				var pieceData = [];

				for(var i=0; i<id.length; i++) {
					pieceData.push({
						"piece" : id[i]
					});
				}
			} else {
				var pieceData = [
					{
						"piece" : id
					}
				];
			}
			var data = {
				"type" : "flipCard",
				"data" : pieceData
			};
			this.send(data);
		},

		createDeck: function (deckData) {
			//TODO
		},

		addCardPieceToDeck: function (deckID, cardID) {
			//TODO
		},

		addCardTypeToDeck: function (deckID, icon) {
			//TODO
		},

		drawCard: function (deckID, count) {
			if(deckID.constructor === Array) {
				var pieceData = [];

				for(var i=0; i<deckID.length; i++) {
					pieceData.push({
						"deck" : deckID[i],
						"count" : color[i]
					});
				}
			} else {
				var pieceData = [
					{
						"piece" : id,
						"color" : color,
					}
				];
			}
			var data = {
				"type" : "pieceTransform",
				"data" : pieceData
			};
			this.send(data);
		},

		createPrivateZone: function (zoneData) {
			//TODO
		},

		removePrivateZone: function (id) {
			//TODO
		},

		drawScribble: function (scribbleData) {
			//TODO
		},

		//host only commands

		//id is user id of new host
		changeHost: function (id, message) {
			if(vb.users.getLocal().isHost) {
				var data = {
					"type" : "changeHost",
					"data" : {
						"user" : id,
						"msg" : message
					}
				};
				this.send(data);
			}
		},

		announcement: function (message) {
			if(vb.users.getLocal().isHost) {
				var data = {
					"type" : "announcement",
					"data" : {
						"msg" : message
					}
				};
				this.send(data);
			}
		},

		//example serverData:
		// {
		//	"name" : "new servername",
		//	"password" : "qwerty"
		// }
		changeServerInfo: function (serverData) {
			if(vb.users.getLocal().isHost) {
				var data = {
					"type" : "changeServerInfo",
					"data" : serverData
				};
				this.send(data);
			}
		},

		kickUser: function (id, message) {
			if(vb.users.getLocal().isHost) {
				var data = {
					"type" : "kickUser",
					"data" : {
						"user" : id,
						"msg" : message
					}
				};
				this.send(data);
			}
		},

		clearBoard: function () {
			if(vb.users.getLocal().isHost) {
				var data = {
					"type" : "clearBoard"
				};
				this.send(data);
			}
		},

		closeServer: function () {
			if(vb.users.getLocal().isHost) {
				var data = {
					"type" : "closeServer"
				};
				this.send(data);
			}
		},

		loadBoardState: function (boardData) {
			var data = {
				"type" : "loadBoardState",
				"data" : boardData
			};
			this.send(data);
		},

		//handler for server messages
		messageHandler: function (event) {
			console.log("websocket server response: " + event.data);
			var data = JSON.parse(event.data);

			//TODO: most of this stuff
			switch(data["type"]) {
				case "pong":
					break;
				case "error":
					break;
				case "chat":
					break;
				case "beacon":
					break;
				//use "pt" as a shorthand for pieceTransform
				case "pt":
				case "pieceTransform":
					var pieces = data["data"];

					if(data.hasOwnProperty("u")) {
						var mainUser = data["u"];
					} else {
						var mainUser = -1;
					}

					for(index in pieces) {
						var pieceData = pieces[index];

						if(pieceData.hasOwnProperty("p")) {
							pieceData["piece"] = pieceData["p"];
						}

						if(pieceData.hasOwnProperty("u")) {
							pieceData["user"] = pieceData["u"];
						}

						if(!pieceData.hasOwnProperty("user") && mainUser !== -1) {
							pieceData["user"] = mainUser;
						}
						vb.board.transformPiece(pieceData);
					}
					break;
				case "pieceAdd":
					var pieces = data["data"];

					for(index in pieces) {
						var pieceData = pieces[index];
						vb.board.generateNewPiece(pieceData);
					}
					break;
				case "pieceRemove":
					var pieces = data["data"];

					for(index in pieces) {
						var pieceData = pieces[index];
						vb.board.removePiece(pieceData);
					}
					break;
				case "setBackground":
					vb.board.setBackground(data["data"]["icon"]);
					break;
				case "clearBoard":
					vb.board.clearBoard();
					break;
				case "userConnect":
					var users = data["data"];

					for(var index in users) {
						var userData = users[index];
						vb.users.createNewUser(userData);
					}
					break;
				case "userDisconnect":
					var users = data["data"];

					for(var index in users) {
						var user = users[index];
						vb.users.removeUser(user); //TO FIX
					}
					break;
				case "changeHost":
					vb.users.changeHost(data["data"]["user"]);
					break;
				case "announcement":
					break;
				case "listClients":
					break;
				case "rollDice":
					var dice = data["data"];

					for (var i = 0; i < dice.length; i++) {
						var die = dice[i];
						var id = die["piece"];
						var value = die["result"];

						var piece = vb.board.pieceHash[id];
						piece.roll(value);
					}
					break;
				case "flipCard":
					var cards = data["data"];

					for (var i = 0; i < cards.length; i++) {
						var card = cards[i];
						var id = card["piece"];
						var frontIcon = card["front_icon"];

						var piece = vb.board.pieceHash[id];
						piece.flip(frontIcon);
					}
					break;
				case "createDeck":
					break;
				case "addCard":
					break;
				case "removeCard":
					break;
				case "createPrivateZone":
					break;
				case "removePrivateZone":
					break;
				case "drawScribble":
					break;
				default:
					console.log("unhandled server message: " + data["type"]);
			}
		},

		loadChessGame: function () {
			var chessData = {
				"background" : "",
				"privateZones" : [],
				"pieces" : [
					{
						"pos" : [0, 0],
						"icon" : "/static/img/checkerboard.png",
						"color" : [255, 255, 255],
						"r" : 0,
						"s" : 16,
						"static" : 1,
					},
					this.loadChessGameHelper("nbking", -1,  7),
					this.loadChessGameHelper("nwking",  1, -7),
					this.loadChessGameHelper("nbqueen",  1,  7),
					this.loadChessGameHelper("nwqueen", -1, -7),

					this.loadChessGameHelper("nbrook",  7,  7),
					this.loadChessGameHelper("nbrook", -7,  7),
					this.loadChessGameHelper("nwrook",  7, -7),
					this.loadChessGameHelper("nwrook", -7, -7),

					this.loadChessGameHelper("nbknight",  5,  7),
					this.loadChessGameHelper("nbknight", -5,  7),
					this.loadChessGameHelper("nwknight",  5, -7),
					this.loadChessGameHelper("nwknight", -5, -7),

					this.loadChessGameHelper("nbbishop",  3,  7),
					this.loadChessGameHelper("nbbishop", -3,  7),
					this.loadChessGameHelper("nwbishop",  3, -7),
					this.loadChessGameHelper("nwbishop", -3, -7)
				]
			};

			for(var x = -7; x < 8; x += 2) {
				chessData["pieces"].push(this.loadChessGameHelper("nbpawn", x, 5));
				chessData["pieces"].push(this.loadChessGameHelper("nwpawn", x, -5));
			}
			this.loadBoardState(chessData);
		},

		loadChessGameHelper: function (subicon, x, y) {
			return {
				"icon" : "/static/img/" + subicon + ".png",
				"color" : [255, 255, 255],
				"r" : 0,
				"s" : 2,
				"static" : 0,
				"pos" : [x, y]
			};
		}
	};

	vb.renderInit = function () {
		vb.frame = 0;
		vb.canvas = document.getElementById("canvas");
		var canvas = vb.canvas;
		vb.engine = new BABYLON.Engine(canvas, true);
		vb.scene = (function () {
			var scene = new BABYLON.Scene(vb.engine);
			scene.clearColor = new BABYLON.Color3(0.5, 1, 0.984);
			var camera = new BABYLON.FreeCamera("Camera", new BABYLON.Vector3.Zero(), scene);
			vb.camera = camera;
			camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
			vb.setCameraPerspective();
			camera.setTarget(new BABYLON.Vector3.Zero());

			camera.attachControl(canvas, false);
			//camera.keysUp.push(87); // W
			//camera.keysLeft.push(65); // A
			//camera.keysDown.push(83); // S
			//camera.keysRight.push(68); // D
			camera.keysUp = [];
			camera.keysLeft = [];
			camera.keysDown = [];
			camera.keysRight = [];
			//camera.inertia = 0.6;
			//camera.angularSensibility = Infinity;
			//camera.maxCameraSpeed = 80;
			//camera.cameraAcceleration = 0.1;
			//camera.rotation = new BABYLON.Vector3(Math.PI/2, 0, 0);

			scene.activeCamera = camera;
			camera.detachControl(canvas);
			vb.light = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
			vb.light.groundColor = new BABYLON.Color3(1, 1, 1);
			vb.light.specular = new BABYLON.Color3(0, 0, 0);

			return scene;
		})();
		vb.engine.runRenderLoop(vb.renderLoop);
	};

	vb.setCameraPerspective = function () {
		var ratio = window.innerWidth / window.innerHeight;
		var size = vb.size;
		vb.camera.orthoTop = size;
		vb.camera.orthoBottom = -size;
		vb.camera.orthoRight = ratio*size;
		vb.camera.orthoLeft = -ratio*size;
	};

	vb.loadDummyBlocks = function () {
		vb.board.generateNewPiece("test piece", vb.users.getLocal(), new BABYLON.Vector2(0, 0));
	};

	vb.renderLoop = function () {
		var time = Date.now();
		var dt = time - vb.simTime;
		vb.simTime = time;
		vb.frame++;
		vb.inputs.processInputs(dt);
		vb.board.movePieces(dt);
		vb.scene.render();
	};
})(VBoard);

function Piece(pieceData)
{
	var me = this;

	//TODO: create a mapping from icons to materials/textures as they are created instead of making new ones each time
	var material = new BABYLON.StandardMaterial("std", VBoard.scene);
	icon = pieceData.icon;
	size = pieceData.s;

	material.diffuseTexture = new BABYLON.Texture(icon, VBoard.scene);
	material.diffuseColor = new BABYLON.Color3(pieceData.color[0], pieceData.color[1], pieceData.color[2]);
	material.diffuseTexture.hasAlpha = true;

	var plane = BABYLON.Mesh.CreatePlane("plane", size, VBoard.scene);
	plane.material = material;
	plane.position = new BABYLON.Vector3(pieceData.pos[0], pieceData.pos[1], 0);
	plane.rotation.z = pieceData.r;

	//position - last server confirmed position		
	//targetPosition - the same as position except for when the local user is moving the piece		
	//					specifically, targetPosition is where the piece will end up after transition smoothing		
	//mesh.position - where the piece is being rendered
	this.id = pieceData.piece;
	this.position = new BABYLON.Vector2(pieceData.pos[0], pieceData.pos[1]);
	this.mesh = plane;
	this.icon = icon;
	this.static = pieceData.static == 1;
	this.size = pieceData.s;
	this.highlightTimeout = null;
	this.predictTimeout = null;

	plane.actionManager = new BABYLON.ActionManager(VBoard.scene);

	//TODO: instead of attaching a code action to each piece
	//		we should just have a scene.pick trigger in a global event listener
	//		We also should be able to right click anywhere to bring up a menu
	//		that lets us add a piece at that location.
	plane.actionManager.registerAction(
		new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnLeftPickTrigger, function (evt) {
		if(me.static == false) {
			VBoard.board.setSelectedPieces([me]);

			var pos = VBoard.board.screenToGameSpace(new BABYLON.Vector2(VBoard.scene.pointerX, VBoard.scene.pointerY));
			VBoard.lastDragX = pos.x;
			VBoard.lastDragY = pos.y;
		}

		//check that the shift key was pressed for the context menu
		if(VBoard.inputs.keysPressed.indexOf(16) >= 0) {
			VBoard.menu.createContextMenu(me);
		}
	}));

	return this;
}

function Card(pieceData) {
	this.base = Piece;
	this.base(pieceData);

	this.facedown = true;

	this.flip = function (frontIcon) {
		this.facedown = !this.facedown;

		var scene = VBoard.scene;
		var material = new BABYLON.StandardMaterial("std", scene);

		if (this.facedown) {
			material.diffuseTexture = new BABYLON.Texture(icon, scene);
		}
		else {
			material.diffuseTexture = new BABYLON.Texture(frontIcon, scene);
		}

		material.diffuseTexture.hasAlpha = true;

		this.mesh.material = material;
	}

	return this;
}

function Die(pieceData) {
	this.base = Piece;
	this.base(pieceData);

	this.max = pieceData.max_roll;

	var scene = VBoard.scene;
	var diffuseTexture;

	diffuseTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
	diffuseTexture.hasAlpha = true;
	diffuseTexture.drawText(1, 5, 40, "bold 36px Arial", "black" , "white", true);

	this.mesh.material.diffuseTexture = diffuseTexture;

	this.roll = function(value) {
		this.value = value;

		diffuseTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
		diffuseTexture.hasAlpha = true;
		diffuseTexture.drawText(this.value, 5, 40, "bold 36px Arial", "black" , "white", true);

		this.mesh.material.diffuseTexture = diffuseTexture;
	}

	return this;
}

$(document).ready(function () {
	console.log("document ready");
	VBoard.javascriptInit();
	VBoard.interface.init();
});
