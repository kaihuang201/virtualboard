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

			if(pieceData.hasOwnProperty("icon")) {
				var material = new BABYLON.StandardMaterial("std", vb.scene);
				material.diffuseTexture = new BABYLON.Texture(pieceData["icon"], vb.scene);
				material.diffuseTexture.hasAlpha = true;
				piece.mesh.material = material;
			}

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

		//{ constructors for various piece types
		//Either we should get rid of these or change a lot of code to align with this design scheme

		Piece : (function () {
			function Piece(pieceData) {
				var me = this;

				//TODO: create a mapping from icons to materials/textures as they are created instead of making new ones each time
				var material = new BABYLON.StandardMaterial("std", vb.scene);
				icon = pieceData.icon;
				size = pieceData.s;

				material.diffuseTexture = new BABYLON.Texture(icon, vb.scene);
				material.diffuseColor = new BABYLON.Color3(pieceData.color[0], pieceData.color[1], pieceData.color[2]);
				material.diffuseTexture.hasAlpha = true;

				var plane = BABYLON.Mesh.CreatePlane("plane", size, vb.scene);
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
				this.isCard = false;
				this.isDie = false;

				plane.actionManager = new BABYLON.ActionManager(vb.scene);

				//TODO: instead of attaching a code action to each piece
				//		we should just have a scene.pick trigger in a global event listener
				//		We also should be able to right click anywhere to bring up a menu
				//		that lets us add a piece at that location.
				plane.actionManager.registerAction(
					new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnLeftPickTrigger, function (evt) {
					if(me.static == false) {
						vb.board.setSelectedPieces([me]);

						var pos = vb.board.screenToGameSpace(new BABYLON.Vector2(vb.scene.pointerX, vb.scene.pointerY));
						vb.lastDragX = pos.x;
						vb.lastDragY = pos.y;
					}

					//check that the shift key was pressed for the context menu
					if(vb.inputs.keysPressed.indexOf(16) >= 0) {
						vb.menu.createContextMenu(me);
					}
				}));
			}
			return Piece;
		})(),

		Card: (function () {
			function Card(pieceData) {
				this.base = vb.board.Piece;
				this.base(pieceData);
				this.isCard = true;

				if(pieceData["cardData"].hasOwnProperty("count")) {
					this.updateCount(pieceData["cardData"]["count"]);
				} else {
					this.updateCount(1);
				}
			}

			//TODO: the only reason to have a flip function separate from pieceTransform(icon) is to do some kind of flipping animation
			Card.prototype.flip = function (frontIcon) {
				var scene = vb.scene;
				var material = new BABYLON.StandardMaterial("std", scene);
				material.diffuseTexture = new BABYLON.Texture(frontIcon, scene);
				material.diffuseTexture.hasAlpha = true;

				this.mesh.material = material;
			}

			Card.prototype.updateCount = function(newCount) {
				//TODO: remove text when only one is remaining
				//TODO: figure out how to overlay text on actual background
				this.numCards = newCount;
				//this.mesh.material.diffuseTexture.drawText(this.numCards, null, 50 * this.size, "bold 128px Arial", "rgba(255,255,255,1.0)", "black");
			}
			return Card;
		})(),

		Die: (function () {
			function Die(pieceData) {
				this.base = Piece;
				this.base(pieceData);
				this.isDie = true;

				this.max = pieceData["diceData"]["max"];

				var scene = vb.scene;
				var material = new BABYLON.StandardMaterial("std", scene);
				material.diffuseTexture.hasAlpha = true;
				this.mesh.material = material;

				self.faces = pieceData["diceData"]["faces"]
			}

			//TODO: the only reason to have a roll function separate from pieeTransform is to have an animation
			Die.prototype.roll = function(value) {
				if(value < this.faces.length) {
					this.icon = this.faces[value];
				} else {
					if(this.max < 7) {
						this.icon = "/static/img/die_face/small_die_face_" + value + ".png"
					} else {
						this.icon = "/static/img/die_face/big_die_face_" + value + ".png"
					}
				}
				material.diffuseTexture = new BABYLON.Texture(this.icon, vb.scene);
				material.diffuseTexture.hasAlpha = true;
				this.mesh.material = material;
			}
			return Die;
		})(),

		//} //end constructors

		//takes JSON formatted data from socket handler
		generateNewPiece: function (pieceData) {
			var piece;

			if(pieceData.hasOwnProperty("cardData")){
				piece = new this.Card(pieceData);
			} else if(pieceData.hasOwnProperty("diceData")) {
				piece = new this.Die(pieceData);
			} else {
				piece = new this.Piece(pieceData);
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
		},

		//special pieces
		changeDeckCount: function (deckData) {
			var userID = deckData["user"];
			var deckID = deckData["piece"];
			var count = deckData["count"];

			var deck = this.pieceHash[deckID];
			var user = vb.users.userList[userID];

			this.highlightPiece(deck, user.color, vb.moveHighlightDuration);
			deck.updateCount(count);
		},

		shuffleDeck: function (deckData) {
			var userID = deckData["user"];
			var deckID = deckData["piece"];

			var deck = this.pieceHash[deckID];
			var user = vb.users.userList[userID];

			this.highlightPiece(deck, user.color, vb.moveHighlightDuration);

			var scene = vb.scene;
			var material = new BABYLON.StandardMaterial("std", scene);
			material.diffuseTexture.hasAlpha = true;
			deck.mesh.material = material;
		}
	};
})(VBoard);
