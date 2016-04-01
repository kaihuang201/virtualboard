var VBoard = VBoard || {};
(function (vb) {

	vb.board = {
		//members
		pieces: [], //ordered list
					//we may want to keep separate lists for static and non-static pieces
					//or we can just not push static pieces to the back

		pieceHash: {},	//maps from piece ids to indicies in pieces array

		//a map from private zone id's to private zone objects
		privateZones: {},

		pieceNameMap: {},
		cardNameMap: {},
		dieNameMap: {},

		//key - a texture url that has been reqested
		//value - a set of piece objects waiting on this texture
		pendingTextures: {},

		//a map from texture urls to texture objects
		//fully loaded textures only
		textureMap: {},
		unknownTexture: null,

		background: "",

		//methods

		//adds a new piece to the front of the board
		//should only be called by the generateNewPiece() method
		add: function (piece) {
			this.pieceHash[piece.id] = this.pieces.length;
			this.pieces.push(piece);
			var z = this.getZIndex(this.pieces.length-1);
			piece.mesh.position.z = z;
		},

		ourIndexOf: function (piece) {
			if(this.pieceHash.hasOwnProperty(piece.id)) {
				return this.pieceHash[piece.id];
			}
			console.log("NOT FOUND: " + piece.id);
			return -1;
		},

		getFromID: function (pieceID) {
			if(this.pieceHash.hasOwnProperty(pieceID)) {
				return this.pieces[this.pieceHash[pieceID]];
			}
			return null;
		},

		//function to calculate z index given a position in the pieces array
		getZIndex: function (index) {
			return 1 + (10/(0.2*index + 1));
		},

		//takes JSON formatted data from web handler
		removePiece: function (pieceData) {
			var index = this.pieceHash[pieceData["piece"]];
			var piece = this.pieces[index];
			this.remove(piece);
		},

		//removes a piece from the board
		remove: function (piece) {
			//we should call bringToFront instead of doing this probably
			var index = this.ourIndexOf(piece);

			for(var i = index; i < this.pieces.length-1; i++) {
				var p = this.pieces[i+1];
				this.pieceHash[p.id] = i;
				this.pieces[i] = p;
				p.mesh.position.z = this.getZIndex(i);
			}

			//TODO: disable highlight on piece if it exists
			clearTimeout(piece.highlightTimeout);
			clearTimeout(piece.predictTimeout);
			vb.sessionIO.moveBuffer.remove(piece.id);

			if(this.pendingTextures.hasOwnProperty(piece.icon)) {
				delete this.pendingTextures[piece.icon][piece.id];
			}

			this.pieces.pop();
			delete this.pieceHash[piece.id];
			piece.mesh.dispose();
		},

		//moves a piece to the back of the board (highest z index)
		pushToBack: function (piece) {
			var index = this.ourIndexOf(piece);

			for(var i = index; i > 0; i--) {
				var p = this.pieces[i-1];
				this.pieceHash[p.id] = i;
				this.pieces[i] = p;
				p.mesh.position.z = this.getZIndex(i);
			}
			this.pieceHash[piece.id] = 0;
			this.pieces[0] = piece;
			piece.mesh.position.z = this.getZIndex(0);
		},

		//moves a piece to the front of the board (lowest z index)
		bringToFront: function (piece) {
			var index = this.ourIndexOf(piece);

			for(var i = index; i < this.pieces.length-1; i++) {
				var p = this.pieces[i+1];
				this.pieceHash[p.id] = i;
				this.pieces[i] = p;
				p.mesh.position.z = this.getZIndex(i);
			}

			var end = this.pieces.length-1;
			this.pieceHash[piece.id] = end;
			this.pieces[end] = piece;
			piece.mesh.position.z = this.getZIndex(end);
		},

		//toggles whether a piece should be static or not
		//should not be used
		//toggleStatic: function (piece) {
		//	piece.static = !piece.static;
		//},

		//called by web socket handler upon receiving an update
		transformPiece: function (pieceData) {
			var index = this.pieceHash[pieceData["piece"]];
			var piece = this.pieces[index];
			var user = vb.users.userList[pieceData["user"]];

			this.highlightPiece(piece, user.color, vb.moveHighlightDuration);

			if(pieceData.hasOwnProperty("icon")) {
				this.setIcon(piece, pieceData["icon"]);
			}

			if(pieceData.hasOwnProperty("color")) {
				var c = pieceData["color"];
				piece.color = new BABYLON.Color3(c[0]/255, c[1]/255, c[2]/255);
				piece.mesh.material.diffuseColor = piece.color;
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
				piece.mesh.rotation.z = pieceData["r"];
			}

			if(pieceData.hasOwnProperty("s")) {
				piece.mesh.scaling.y = pieceData["s"];
				this.adjustPieceWidth(piece);
			}

			if(pieceData.hasOwnProperty("static")) {
				piece.static = pieceData["static"] == 1;
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
					if(!this.pieceHash.hasOwnProperty(id)) {
						//the piece was deleted, we don't need to keep track of it anymore
						//TODO: this should be handled by the remove method instead of here
						delete this.smoothedPieces[id];
						continue;
					}
					var moveInfo = this.smoothedPieces[id];
					var index = this.pieceHash[id];
					var piece = this.pieces[index];
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

			if(piece.outlined) {
				piece.mesh.renderOutline = false;
			}

			//var babylonColor = new BABYLON.Color3(color[0]/255, color[1]/255, color[2]/255);

			piece.mesh.overlayColor = color;
			piece.mesh.renderOverlay = true;
			piece.highlightTimeout = setTimeout(function () {
				piece.mesh.renderOverlay = false;
				piece.highlightTimeout = null;

				if(piece.outlined) {
					piece.mesh.renderOutline = true;
				}
			}, duration);
		},

		//although the engine has outlines override overlays
		//I want overlays to override outlines
		outlinePiece: function (piece, color, on) {
			if(on === void 0) {
				on = true;
			}
			piece.outlined = on;

			if(on) {
				piece.mesh.outlineColor = color;

				if(!piece.mesh.renderOverlay) {
					piece.mesh.renderOutline = true;
				}
			} else {
				piece.mesh.renderOutline = false;
			}
		},

		//takes JSON formatted data from socket handler
		generateNewPiece: function (pieceData) {
			var piece = {};

			piece.size = pieceData["s"];
			var c = pieceData["color"];
			piece.color = new BABYLON.Color3(c[0]/255, c[1]/255, c[2]/255);

			var plane = BABYLON.Mesh.CreatePlane("plane", piece.size, vb.scene);
			var material = new BABYLON.StandardMaterial("std", vb.scene);
			plane.position = new BABYLON.Vector3(pieceData["pos"][0], pieceData["pos"][1], 0);
			plane.rotation.z = pieceData["r"];
			plane.piece = piece;
			plane.material = material;

			//position - last server confirmed position		
			//targetPosition - the same as position except for when the local user is moving the piece		
			//					specifically, targetPosition is where the piece will end up after transition smoothing		
			//mesh.position - where the piece is being rendered
			piece.id = pieceData["piece"];
			piece.position = new BABYLON.Vector2(pieceData["pos"][0], pieceData["pos"][1]);
			piece.mesh = plane;
			piece.static = pieceData["static"] == 1;
			piece.highlightTimeout = null;
			piece.predictTimeout = null;
			piece.isCard = false;
			piece.isDie = false;
			piece.lastTrigger = 0;
			this.setIcon(piece, pieceData["icon"]);

			if(pieceData.hasOwnProperty("cardData")) {
				piece.isCard = true;

				if(pieceData["cardData"].hasOwnProperty("count")) {
					vb.board.setCardCount(piece, pieceData["cardData"]["count"]);
				} else {
					vb.board.setCardCount(piece, 1);
				}
			}

			if(pieceData.hasOwnProperty("diceData")) {
				piece.isDie = true;
				piece.max = pieceData["diceData"]["max"];
				piece.faces = pieceData["diceData"]["faces"];
			}

			plane.actionManager = new BABYLON.ActionManager(vb.scene);

			//TODO: instead of attaching a code action to each piece
			//		we should just have a scene.pick trigger in a global event listener
			//		We also should be able to right click anywhere to bring up a menu
			//		that lets us add a piece at that location.

			//TODO: do not register if static, make a register/unregister block in transformPiece
			plane.actionManager.registerAction(
				new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnLeftPickTrigger, function (evt) {
					console.debug(evt);
					console.log("click on: " + piece.id);

					if(piece.static == false) {

						//check that the shift key was pressed for the context menu
						if(evt.sourceEvent.shiftKey) {
							if(vb.selection.hasPiece(piece)) {
								console.log("shift+remove");
								vb.selection.removePiece(piece);
							} else {
								console.log("shift+add");
								vb.selection.addPiece(piece);
							}
							//vb.menu.createContextMenu(piece);
						} else {
							var time = vb.simTime;

							if(vb.selection.hasPiece(piece)) {
								vb.selection.clearAndSetOnMouseUp = piece;

								//TODO: the exact logic on when to trigger a double click still needs to be worked out
								if(time - piece.lastTrigger < vb.doubleClickTime) {
									vb.board.doubleClick(piece);
								}
							} else {
								vb.selection.setPieces([piece]);
							}
							piece.lastTrigger = time;
						}
						evt.sourceEvent.handled = true;
					}
				})
			);

			this.add(piece);

			if(pieceData.hasOwnProperty("user")) {
				var user = vb.users.userList[pieceData["user"]];
				this.highlightPiece(piece, user.color, vb.addHighlightDuration);
			}
			return piece;
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
		},

		//TODO: maybe a toggle for auto resizing
		setIcon: function (piece, icon) {
			//THEPIECE = piece;
			//console.debug(piece);
			if(this.pendingTextures.hasOwnProperty(piece.icon)) {
				delete this.pendingTextures[piece.icon][piece.id];
			}
			piece.icon = icon;

			if(this.textureMap.hasOwnProperty(icon)) {
				piece.mesh.material.diffuseTexture = this.textureMap[icon];
				vb.board.adjustPieceWidth(piece);
			} else {
				if(!this.pendingTextures.hasOwnProperty(icon)) {
					this.pendingTextures[icon] = {};

					//function Texture(url, scene, noMipmap, invertY, samplingMode, onLoad, onError, buffer, deleteBuffer)
					var texture = new BABYLON.Texture(icon, vb.scene, void(0), void(0), void(0), function () {
						//onload
						vb.board.textureMap[icon] = texture;
						texture.hasAlpha = true;

						for(var pieceID in vb.board.pendingTextures[icon]) {
							if(vb.board.pendingTextures[icon].hasOwnProperty(pieceID)) {
								var index = vb.board.pieceHash[pieceID];
								var p = vb.board.pieces[index];
								p.mesh.material.diffuseTexture = texture;
								vb.board.adjustPieceWidth(p);
							}
						}
						delete vb.board.pendingTextures[icon];
					}, function () {
						//onerror
						console.log("Failed to load texture: " + icon);
						vb.board.textureMap[icon] = vb.board.unknownTexture;
						delete vb.board.pendingTextures[icon];
					});
				}
				this.pendingTextures[icon][piece.id] = true;

				if(this.unknownTexture === null) {
					this.unknownTexture = new BABYLON.Texture("/static/img/unknown.png", vb.scene);
					this.unknownTexture.hasAlpha = true;
				}
				piece.mesh.material.diffuseTexture = this.unknownTexture;
			}
		},

		adjustPieceWidth: function (piece) {
			var t = piece.mesh.material.diffuseTexture._texture;
			//for some bizzare reason, not using the intermediate ratio variable makes this not work
			ratio = piece.mesh.scaling.y * t._baseWidth / t._baseHeight;
			piece.mesh.scaling.x = ratio;
		},

		//special pieces

		shuffleDeck: function (deckData) {
			var userID = deckData["user"];
			var deckID = deckData["piece"];

			var index = this.pieceHash[deckID];
			var deck = this.pieces[index];
			var user = vb.users.userList[userID];

			this.highlightPiece(deck, user.color, vb.moveHighlightDuration);
			this.setIcon(deck, deckData["icon"]);
		},

		//TODO: the naming doesn't make a ton of sense here, needs some updating
		//I did it this way to reflect how remove/removePiece was done
		rollDiePiece: function (pieceData) {
			var id = pieceData["piece"];
			var value = pieceData["result"];

			var user = vb.users.userList[pieceData["user"]];
			var index = this.pieceHash[id];
			var piece = this.pieces[index];
			this.highlightPiece(piece, user.color, vb.addHighlightDuration);
			this.rollDice(piece, value);
		},

		//TODO: the only reason to have a roll function separate from pieceTransform is to have an animation
		rollDice: function(piece, value) {
			if(!piece.isDie) {
				console.log("Warning: rollDice called on non-dice piece");
			}
			var icon = "";

			if(value < piece.faces.length) {
				icon = piece.faces[value];
			} else {
				if(piece.max < 7) {
					icon = "/static/img/die_face/small_die_face_" + (value) + ".png"
				} else {
					icon = "/static/img/die_face/big_die_face_" + (value) + ".png"
				}
			}
			this.setIcon(piece, icon);
		},

		//handles data from socket handler
		flipCardPiece: function (pieceData) {
			var id = pieceData["piece"];
			var frontIcon = pieceData["icon"];
			var user = vb.users.userList[pieceData["user"]];
			var index = this.pieceHash[id];
			var piece = this.pieces[index];
			this.highlightPiece(piece, user.color, vb.addHighlightDuration);
			this.flipCard(piece, frontIcon);
		},

		//TODO: the only reason to have a flip function separate from pieceTransform(icon) is to do some kind of flipping animation
		flipCard: function (piece, frontIcon) {
			if(!piece.isCard) {
				console.log("Warning: flipCard called on non-card piece");
			}
			//TODO: animation
			this.setIcon(piece, frontIcon);
		},

		changeDeckCount: function (deckData) {
			var userID = deckData["user"];
			var deckID = deckData["piece"];
			var count = deckData["count"];

			var index = this.pieceHash[deckID];
			var deck = this.pieces[index];
			var user = vb.users.userList[userID];

			this.highlightPiece(deck, user.color, vb.moveHighlightDuration);
			this.setCardCount(deck, count);
		},

		setCardCount: function(piece, newCount) {
			if(!piece.isCard) {
				console.log("Warning: setCardCount called on non-card piece");
			}
			//TODO: remove text when only one is remaining
			//TODO: figure out how to overlay text on actual background
			piece.numCards = newCount;
			//this.mesh.material.diffuseTexture.drawText(this.numCards, null, 50 * this.size, "bold 128px Arial", "rgba(255,255,255,1.0)", "black");
		},

		doubleClick: function(piece) {
			//TODO: I think a double click + drag on a deck should pick up the deck
			//		a single click + drag simply draws the top card off the deck
			if(piece.isCard) {
				vb.sessionIO.flipCard(piece.id);
			}

			if(piece.isDie) {
				vb.sessionIO.rollDice(piece.id);
			}
		}
	};
})(VBoard);
