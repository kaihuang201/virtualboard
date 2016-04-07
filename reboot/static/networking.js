var VBoard = VBoard || {};
(function (vb) {

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

		gameIDExists: function (lobbyID) {
			var data = {
				"type" : "gameIDExists",
				data : {
					"gameID" : lobbyID
				}
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
					if (($("#template-modal").data('bs.modal') || {}).isShown) {
						vb.interface.setTemplateModalAlert(data["data"][0]["msg"]);
					} else {
						vb.interface.alertModal(data["data"][0]["msg"],0);
					}
					break;
				case "initSuccess":
					console.log("Coming to you live from " + data["data"]["gameName"]);
					var users = data["data"]["users"];

					//initialize user list
					for(var index in users) {
						var userData = users[index];
						vb.users.createNewUser(userData);
					}

					// set cookie active for 120 minutes since game starts
					vb.cookie.deleteCookie();
					vb.cookie.setCookie(VBoard.interface.userName, VBoard.interface.colorSelected, data["data"]["gameID"], 120); // make sure this step comes before switchToGameMode()
					// console.log("cookie setup ->> "+VBoard.interface.userName + VBoard.interface.colorSelected + data["data"]["gameID"]);

					//switch from lobby state to game state
					vb.interface.switchToGameMode();
					vb.sessionIO.getClientList();
					vb.socket.onmessage = vb.sessionIO.messageHandler;
					vb.launchCanvas();

					//initialize board data
					var boardData = data["data"]["board"];
					vb.board.loadBoardData(boardData);

					break;
				case "initFailure":
					if (($("#template-modal").data('bs.modal') || {}).isShown) {
						vb.interface.setTemplateModalAlert(data["data"]["msg"]);
					} else {
						vb.interface.alertModal(data["data"]["msg"],0);
					}
					break;
				case "listGames":
					vb.interface.showListGames(data["data"]);
					break;
				case "gameIDExists":
					// console.log("gameIDExists response: " + JSON.stringify(data["data"]["gameIDExists"]));
					vb.interface.resumeButtonInit(data["data"]["gameIDExists"],data["data"]["password"],data["data"]["name"]);
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
						"pos" : [x, y]
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

		changeColor: function (color) {
			var data = {
				"type" : "changeColor",
				"data" : {
					"color" : color
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
					"pos" : [vb.camera.position.x, vb.camera.position.y],
					"color" : [255, 255, 255],
					"r" : Math.atan2(vb.camera.upVector.y, vb.camera.upVector.x) - Math.PI/2,
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

					//since we are going to remove the piece, we cancel pending moves
					this.moveBuffer.remove(id[i]);
				}
			} else {
				var pieceData = [
					{
						"piece" : id
					}
				];

				//since we are going to remove the piece, we cancel pending moves
				this.moveBuffer.remove(id);
			}
			var data = {
				"type" : "pieceRemove",
				"data" : pieceData
			};
			this.send(data);
		},

		setBackground: function (icon) {
			var data = {
				"type" : "setBackground",
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
					var prev = this.listMap[id].prev;
					var next = this.listMap[id].next;

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
						"static" : vb.board.getFromID(id[i]).static ? 1 : 0
					});
				}
			} else {
				var pieceData = [
					{
						"piece" : id,
						"static" : vb.board.getFromID(id[i]).static ? 1 : 0
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

		// Might need to change data format depending on implementation of interface
		addCardToDeck: function (cardID, deckID) {
			if(deckID.constructor === Array) {
				var pieceData = [];

				for(var i=0; i<cardID.length; i++) {
					pieceData.push({
						"deck" : deckID[i],
						"card" : cardID[i]
					});

					//since we are going to remove the piece, we cancel pending moves
					this.moveBuffer.remove(cardID[i]);
				}
			} else {
				var pieceData = [
					{
						"deck" : deckID,
						"card" : cardID
					}
				];

				//since we are going to remove the piece, we cancel pending moves
				this.moveBuffer.remove(cardID);
			}
			var data = {
				"type" : "addCardToDeck",
				"data" : pieceData
			}
			this.send(data)
		},

		drawCard: function (deckID) {
			console.log("draw card" + deckID)
			var cameraRotation = Math.atan2(vb.camera.upVector.y, vb.camera.upVector.x);

			if(deckID.constructor === Array) {
				var pieceData = [];

				for(var i=0; i<deckID.length; i++) {
					pieceData.push({
						"piece" : deckID[i],
						"cameraRotation" : cameraRotation
					});
				}
			} else {
				var pieceData = [
					{
						"piece" : deckID,
						"cameraRotation" : cameraRotation
					}
				];
			}
			var data = {
				"type" : "drawCard",
				"data" : pieceData
			};
			this.send(data);
		},

		shuffleDeck: function (deckID) {
			if(deckID.constructor === Array) {
				var pieceData = [];

				for(var i=0; i<deckID.length; i++) {
					pieceData.push({
						"piece" : deckID[i]
					});
				}
			} else {
				var pieceData = [
					{
						"piece" : deckID
					}
				];
			}
			var data = {
				"type" : "shuffleDeck",
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

		requestSave: function () {
			var data = {
				"type" : "requestSave"
			};
			this.send(data);
		},

		//requestLoad: function () {
		//	var data = {
		//		"type" : "requestLoad"
		//	}
		//	this.send(data);
		//},

		//host only commands

		addPrivateZone: function(x, y, width, height, color) {
			if(vb.users.getLocal().isHost) {
				var data = {
					"type" : "addPrivateZone",
					"data" : {
						"pos" : {
							"x" : x,
							"y" : y
						},
						"width" : width,
						"height" : height,
						"rotation" : Math.atan2(vb.camera.upVector.y, vb.camera.upVector.x) - Math.PI/2,
						"color" : color
					}
				};
				this.send(data);
			}
		},

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
					if (($("#template-modal").data('bs.modal') || {}).isShown) {
						vb.interface.setTemplateModalAlert(data["data"][0]["msg"]);
					} else {
						vb.interface.alertModal(data["data"][0]["msg"],0);
					}
					break;
				case "chat":
					vb.interface.chatIncomingMsg(data["data"][0]["msg"],true);
					break;
				case "beacon":
					var beacons = data["data"];

					for(index in beacons) {
						var beaconData = beacons[index];
						vb.board.beacon(beaconData);
					}
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

					// TODO: S13  - handle disconnect gracefully

					break;
				case "changeColor":
					var users = data["data"];

					for(var index in users) {
						vb.users.changeUserColor(users[index]["user"], users[index]["color"]);
					}
					break;
				case "addPrivateZone":
					vb.board.addPrivateZone(data["data"])
					break;
				case "changeHost":
					vb.users.changeHost(data["data"]["user"]);
					break;
				case "announcement":
					// vb.interface.alertModal(data["data"][0]["msg"]);
					vb.interface.chatIncomingMsg(data["data"][0]["msg"],false);
					break;
				case "listClients":
					vb.interface.showPlayerList(data["data"]);
					break;
				case "rollDice":
					var dice = data["data"];

					for (var i = 0; i < dice.length; i++) {
						var die = dice[i];
						vb.board.rollDiePiece(die);
					}
					break;
				case "flipCard":
					var cards = data["data"];

					for (var i = 0; i < cards.length; i++) {
						var card = cards[i];
						vb.board.flipCardPiece(card);
					}
					break;
				case "changeDeckCount":
					var decks = data["data"];

					for(var i=0; i<decks.length; i++) {
						var deckData = decks[i];
						vb.board.changeDeckCount(deckData);
					}
					break;
				case "shuffleDeck":
					var decks = data["data"];

					for(var i=0; i<decks.length; i++) {
						var deckData = decks[i];
						vb.board.shuffleDeck(deckData);
					}
					break;
				case "removePrivateZone":
					break;
				case "drawScribble":
					break;
				case "savePrep":
					var lobby = data["data"].lobbyId;
					var key = data["data"].key;
					window.location = "/save?lobbyId=" + lobby + "&key=" + key;
	                break;
//	            case "loadPrep":
//					var file_field = $("#fileField")[0];
//					var formData = new FormData();
//			        formData.append("upload", file_field.files[0]);
//			        formData.append("lobbyId", data["data"].lobbyId);
//			        formData.append("key", data["data"].key);
//			        var xhr = new XMLHttpRequest();
//			        xhr.open('POST', 'load', true);
//			        xhr.onload = function () {
//			        };
//			        xhr.send(formData);
//	            	break;
				default:
					console.log("unhandled server message: " + data["type"]);
			}
		}
	};
})(VBoard);
