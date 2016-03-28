var VBoard = VBoard || {};
(function (vb) {

	vb.board = {
		//members
		pieces: [], //ordered list
					//we may want to keep separate lists for static and non-static pieces
					//or we can just not push static pieces to the back

		pieceHash: {},	//unordered hash map of pieces
						//maps from piece ids to piece objects

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
				piece.adjustWidth();
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
			if (pieceData.hasOwnProperty("faceup")){
                piece = new vb.Card(pieceData);
            }
            else if (pieceData.hasOwnProperty("max_roll")) {
                piece = new vb.Die(pieceData);
            }
            else if (pieceData.hasOwnProperty("count")) {
                piece = new vb.Deck(pieceData);
            }
            else {
                piece = new vb.Piece(pieceData);
            }
			this.add(piece);
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

						for(var piece_id in vb.board.pendingTextures[icon]) {
							if(vb.board.pendingTextures[icon].hasOwnProperty(piece_id)) {
								var p = vb.board.pieceHash[piece_id];
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

			var deck = this.pieceHash[deckID];
			var user = vb.users.userList[userID];

			this.highlightPiece(deck, user.color, vb.moveHighlightDuration);
			this.setIcon(deck, deckData["icon"]);
		},

		//TODO: the only reason to have a roll function separate from pieceTransform is to have an animation
		rollDie: function(pieceData, value) {
			var id = pieceData["piece"];
			var value = pieceData["result"];
			var user = vb.users.userList[pieceData["user"]];
			var piece = vb.board.pieceHash[id];

			if(!(piece instanceof vb.Die)) {
				console.log("Warning: rollDice called on non-dice piece");
			}
			vb.board.highlightPiece(piece, user.color, vb.addHighlightDuration);
			piece.roll(value);
		},

		//TODO: the only reason to have a flip function separate from pieceTransform(icon) is to do some kind of flipping animation
		flipCard: function (pieceData) {
			//TODO: animation
			var id = pieceData["piece"];
			var frontIcon = pieceData["front_icon"];
			var user = vb.users.userList[pieceData["user"]];
			var piece = vb.board.pieceHash[id];

			if(!(piece instanceof vb.Card)) {
				console.log("Warning: flipCard called on non-card piece");
			}
			vb.board.highlightPiece(piece, user.color, vb.addHighlightDuration);
			piece.flip(frontIcon);
		},

		changeDeckCount: function (deckData) {
			var userID = deckData["user"];
			var deckID = deckData["piece"];
			var count = deckData["count"];

			var deck = this.pieceHash[deckID];
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
		}
	};
})(VBoard);