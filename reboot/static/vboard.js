var VBoard = VBoard || {};
(function (vb) {
	//size of the vertical view plane
	vb.size = 10;

	//max/min/view size should be bound to VBoard.board
	vb.maxSize = 55;
	vb.minSize = 5;
	vb.BoardHeight = 50;
	vb.BoardWidth = 50;

	vb.javascriptInit = function () {
		//networking
		vb.socket = new WebSocket("ws://" + window.location.host + window.location.pathname + "game");

		vb.socket.onopen = function () {
			//fetch game list
		};
		vb.socket.onmessage = vb.limboIO.messageHandler;
		vb.socket.onclose = function () {
			console.log("rip socket");
		};
	};

	vb.launchCanvas = function () {
		vb.simTime = Date.now();
		window.addEventListener("resize", vb.setCameraPerspective);
		window.addEventListener("keydown", function (evt) {
			vb.inputs.onKeyDown(evt.keyCode);
			//if(!evt.metaKey) {
			//	evt.preventDefault();
			//}
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

		window.addEventListener("mouseup", function(evt){
			vb.board.removeSelectedPiece();
		});

		window.addEventListener("mousemove", function(evt){
			vb.board.dragPiece();
		});

		vb.renderInit();

		if(!vb.testing) {
			vb.loadDummyBlocks();
		}
	};

	vb.board = {
		//members
		pieces: [], //ordered list
					//we may want to keep separate lists for static and non-static pieces
					//or we can just not push static pieces to the back

		pieceHash: {}, //unordered hash map of pieces

		//a map from private zone id's to private zone objects
		privateZones: {},

		//this should probably be fetched as a separate file
		pieceNameMap: {},

		selectedPieces: [],

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
			for(var i = 0; i < this.pieces.length; i++){
				if(this.pieces[i].id == piece.id){
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
			var index = this.pieces.ourIndexOf(piece);
			for(var i = index; i < this.pieces.length-1; i++) {
				this.pieces[i] = this.pieces[i+1];
				this.pieces[i].mesh.position.z = this.getZIndex(i);
			}

			//TODO: disable highlight on piece if it exists

			this.pieces.pop();
			delete this.pieceHash[piece.id];
			piece.mesh.dispose();
		},

		//moves a piece to the back of the board (highest z index)
		pushToBack: function (piece) {
			var index = this.pieces.ourIndexOf(piece);

			for(var i = index; i > 0; i--) {
				this.pieces[i] = this.pieces[i-1];
				this.pieces[i].mesh.position.z = this.getZIndex(i);
			}
			this.pieces[0] = piece;
			piece.mesh.position.z = this.getZIndex(0);
		},

		//moves a piece to the front of the board (lowest z index)
		bringToFront: function (piece) {
			var index = this.pieces.ourIndexOf(piece);
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
			//}
		},

		//called by web socket handler upon receiving an update
		transformPiece: function (pieceData) {
			var piece = pieceHash[pieceData.piece];
			var user = vb.users.userList[pieceData.user];
			//piece.user = pieceData.user;

			this.highlightPiece(piece, new BABYLON.Color3(
				user.color[0],
				user.color[1],
				user.color[2]));

			if(pieceData.hasOwnProperty("color")) {
				piece.mesh.material.diffuseColor = new BABYLON.Color3(pieceData.color[0], pieceData.color[1], pieceData.color[2]);
			}

			if(pieceData.hasOwnProperty("pos")) {
				piece.position.x = pieceData.pos[0];
				piece.position.y = pieceData.pos[1];

				if (!user.isLocal) {
					piece.mesh.position.x = pieceData.pos[0];
					piece.mesh.position.y = pieceData.pos[1];
				} else {
					//TODO: check to see if piece.mesh.position agrees with piece.position and update timeout
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

		//takes a piece object from the board.pieces array
		highlightPiece: function (piece, color) {
			//to do: highlight the piece with piece.user's color when moving
			//should time out after 500 ms probably if this is not called again
		},

		//takes JSON formatted data from socket handler
		generateNewPiece: function (pieceData) {
			//to do: create a proper piece "class" with a constructor and methods
			var material = new BABYLON.StandardMaterial("std", vb.scene);
			var icon = "/static/img/crown.png";
			var size = 3.0;

			/*if(this.pieceNameMap.hasOwnProperty(name)) {
				icon = this.pieceNameMap[name].icon;
				size = this.pieceNameMap[name].size;
			}*/
			icon = pieceData.icon;
			size = pieceData.s;

			material.diffuseTexture = new BABYLON.Texture(icon, vb.scene);
			material.diffuseColor = new BABYLON.Color3(pieceData.color[0], pieceData.color[1], pieceData.color[2]);
			material.diffuseTexture.hasAlpha = true;

			var plane = BABYLON.Mesh.CreatePlane("plane", size, vb.scene);
			plane.material = material;
			plane.position = new BABYLON.Vector3(pieceData.pos[0], pieceData.pos[1], 0);
			plane.rotation.z = pieceData.r;

			var piece = {};
			piece.id = pieceData.piece;
			//piece.user = pieceData.user;
			piece.position = new BABYLON.Vector2(pieceData.pos[0], pieceData.pos[1]);
			piece.pickedUp = !!user;
			piece.mesh = plane;
			piece.icon = icon;

			piece.static = pieceData.static == 1;

			plane.actionManager = new BABYLON.ActionManager(vb.scene);

			//TODO: instead of attaching a code action to each piece
			//		we should just have a scene.pick trigger in a global event listener
			//		We also should be able to right click anywhere to bring up a menu
			//		that lets us add a piece at that location.
			plane.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnLeftPickTrigger,
			function (evt) {
				if(piece.static == false) {
					this.setSelectedPiece(piece);
				}

				//check that the shift key was pressed for the context menu
				if(vb.inputs.keysPressed.indexOf(16) >= 0) {
					vb.menu.createContextMenu(piece);
				}
			}));

			this.add(piece);

			var user = vb.users.userList[pieceData.user];
			this.highlightPiece(piece, new BABYLON.Color3(
				user.color[0],
				user.color[1],
				user.color[2]));
			return piece;
		},

		removeSelectedPieces: function () {
			if(this.selectedPieces.length > 0) {
				for(index in this.selectedPieces) {
					this.selectedPieces[index].pickedUp = false;
					//this.selectedPieces[index].user = vb.users.getNone();

					//todo: disable the highlight
				}
				this.selectedPieces = [];
			}
		},

		setSelectedPiece: function (piece) {
			//maybe this should be called first?
			//this.removeSelectedPieces();

			this.selectedPiece = [piece];
			piece.pickedUp = true;
			//piece.user = vb.users.getLocal();
			//todo: enable the highlight
		},

		dragPiece: function () {
			for(index in this.selectedPieces) {
				var piece = this.selectedPieces[index];

				//we should use a difference in mouse position instead of having the piece's center snap to the mouse
				//if a corner is clicked and dragged, then the mouse should stay relative to that corner
				var newPos = this.screenToGameSpace(new BABYLON.Vector2(vb.scene.pointerX, vb.scene.pointerY));

				if(!piece.static) {
					//only the server gets to set the piece's position

					if(newPos.x > vb.boardWidth) {
						newPos.x = vb.boardWidth;
					}

					if(newPos.x < -vb.boardWidth) {
						newPos.x = -vb.boardWidth;
					}

					if(newPos.y > vb.boardHeight) {
						newPos.y = vb.boardHeight;
					}

					if(newPos.y < -vb.boardHeight) {
						newPos.y = -vb.boardHeight;
					}

					vb.selectedPiece.mesh.position.x = newPos.x;
					vb.selectedPiece.mesh.position.y = newPos.y;
					vb.SessionIO.movePiece(vb.selectedPiece.id, newPos.x, newPos.y);
					//todo: set timeout
					//more TODO: keep track of where piece is released
					//then override the local ignore when that final position arrives
					//this fixes a race condition where 2 users move the same piece at the same time
				}
			}
		},

		//we may not need this function, replaced by transformPiece()
		movePiece: function (piece, pos, user, instant) {
			//to do
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
			//screen space
			//also equals to the camera coordinates
			var halfWidth = vb.canvas.width / 2;
			var halfHeight = vb.canvas.height / 2;

			//game space
			var cameraX = vb.camera.position.x;
			var cameraY = vb.camera.position.y;

			//screen space
			var screenDX = (position.x - halfWidth);
			var screenDY = (position.y - halfHeight);

			var ratio = vb.canvas.width / vb.canvas.height;
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

			return new BABYLON.Vector2(totalX, totalY);
		},

		loadChessGame: function () {
			//var chessMap = {
			//	"Rook": 7,
			//	"Knight": 5,
			//	"Bishop": 3,
			//	///meh
			//board
			this.generateNewPiece("chessBoard", null, {x:0, y:0});

			//rooks
			this.generateNewPiece("chessRookBlack", null, {x: 7, y: 7});
			this.generateNewPiece("chessRookBlack", null, {x:-7, y: 7});
			this.generateNewPiece("chessRookWhite", null, {x: 7, y:-7});
			this.generateNewPiece("chessRookWhite", null, {x:-7, y:-7});

			//knights
			this.generateNewPiece("chessKnightBlack", null, {x: 5, y: 7});
			this.generateNewPiece("chessKnightBlack", null, {x:-5, y: 7});
			this.generateNewPiece("chessKnightWhite", null, {x: 5, y:-7});
			this.generateNewPiece("chessKnightWhite", null, {x:-5, y:-7});

			//bishops
			this.generateNewPiece("chessBishopBlack", null, {x: 3, y: 7});
			this.generateNewPiece("chessBishopBlack", null, {x:-3, y: 7});
			this.generateNewPiece("chessBishopWhite", null, {x: 3, y:-7});
			this.generateNewPiece("chessBishopWhite", null, {x:-3, y:-7});

			//queens
			this.generateNewPiece("chessQueenBlack", null, {x: 1, y: 7});
			this.generateNewPiece("chessQueenWhite", null, {x:-1, y:-7});

			//kings
			this.generateNewPiece("chessKingBlack", null, {x:-1, y: 7});
			this.generateNewPiece("chessKingWhite", null, {x: 1, y:-7});

			//pawns
			for(var x = -7; x < 8; x += 2) {
				this.generateNewPiece("chessPawnBlack", null, {x: x, y: 5});
				this.generateNewPiece("chessPawnWhite", null, {x: x, y:-5});
			}
		}
	};

	vb.users = {
		//members
		local: null,
		host: null,
		userList: {},	//unordered
						//maps ids to user objects


		//constructor for internal object
		User: function (id, name, color, isLocal, isHost) {
			//the downside to this construction is that accessing vb.user's methods is not as clean
			this.id = id;
			this.name = name;
			this.color = color;
			this.isLocal = isLocal;
			this.isHost = isHost;
			this.ping = -1;
		},

		//methods
		add: function (user) {
			this.userList[user.id] = user;
		},

		remove: function (user) {
			//var index = this.userList.indexOf(user);

			//this.userList[index] = this.userList[this.userList.length-1];
			//this.userList.pop();
			delete userList[user.id];
		},

		removeUser: function (userData) {
			var id = userData["user"];
			var user = userList[id];
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
			this.userList[this.host].isHost = false;
			this.userList[id].isHost = true;
			this.host = id;

			//TODO: message to local user?
		},

		createNewUser: function (userData) {
			var id = userData["id"];
			var name = userData["name"];
			var color = new BABYLON.Color3(userData["color"][0], userData["color"][1], userData["color"][2]);
			var isLocal = userData["local"] == 1;
			var isHost = userData["host"] == 1;
			
			var user = new this.User(id, name, color, isLocal, isHost);

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

		messageHandler: function (event) {
			console.log("websocket server response: " + event.data);
			var data = JSON.parse(event.data);

			//TODO: most of this stuff
			switch(data["type"]) {
				case "pong":
					break;
				case "error":
					break;
				case "initSuccess":
					console.log("Coming to you live from " + data["data"]["gameName"]);
					var users = data["data"]["users"];

					for(var index in users) {
						var userData = users[index];
						vb.users.createNewUser(userData);
					}
					vb.socket.onmessage = vb.sessionIO.messageHandler;
					vb.launchCanvas();
					break;
				case "initFailure":
					break;
				case "listGames":
					break;
				default:
					//console.log("unhandled server message");
			}
		}
	};

	//socket IO while in a game session
	vb.sessionIO = {
		sendChatMessage: function (message) {
			var data = {
				"type" : "chat",
				"data" : {
					"msg" : message
				}
			};
			this.send(data);
		},

		send: function (data) {
			vb.socket.send(JSON.stringify(data));
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

		sendBeacon: function (x, y) {
			var data = {
				"type" : "beacon",
				"data" : {
					"pos" : [x, y]
				}
			};
			this.send(data);
		},

		//input data is an object that maps properties to values (see pieceData for an example)
		addPiece: function (inputData) {
			//default values
			var pieceData = {
				"icon" : "/static/img/crown.png",
				"pos" [0, 0],
				"r" : 0,
				"s" : 1,
				"static" : 0
			};

			//update with input values
			for(var property in inputData) {
				if(inputData.hasOwnProperty(property)) {
					pieceData[property] = inputData[property];
				}
			}

			var data = {
				"type" : "pieceAdd",
				"data" : [
					pieceData
				]
			};
			this.send(data);
		},

		movePiece: function (id, x, y) {
			//TODO: aggregate move data to reduce socket usage
			var data = {
				"type" : "pieceTransform",
				"data" : [
					{
						"piece" : id,
						"pos" : [x, y]
					}
				]
			};
			this.send(data);
		},

		//TODO: implement
		rotatePiece: function () {},
		resizePiece: function () {},
		recolorPiece: function () {},

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
				case "pieceTransform":
					var pieces = data["data"];

					for(index in pieces) {
						var pieceData = pieces[index];
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
						vb.users.removeID(user.user); //TO FIX
					}
					break;
				case "changeHost":
					vb.users.changeHost(data["data"]);
					break;
				case "announcement":
					break;
				case "createPrivateZone":
					break;
				case "listClients":
					break;
				default:
					//console.log("unhandled server message");
			}
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
		vb.scene.render();
	};
})(VBoard);
$(document).ready(function () {
	console.log("document ready");
	VBoard.javascriptInit();
});
