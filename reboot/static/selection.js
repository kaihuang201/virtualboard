var VBoard = VBoard || {};
(function (vb) {
	vb.selection = {
		pieces: [],
		boxStart: null,
		boxEnd: null,
		newPieces: [],

		//on the next mouse up event, clear selection and set it to just this piece
		clearAndSetOnMouseUp: null,

		//map from piece ids to the index in the pieces array
		pieceMap : {},

		//pieces should be in order from bottom element to top element
		//that way the order won't get jumbled as the pieces move
		setPieces: function (pieces) {
			//maybe this should be called first?
			this.clear();

			for(var i=0; i<pieces.length; i++) {
				var piece = pieces[i];
				this.pieces.push(piece);
				this.pieceMap[piece.id] = i;
				vb.board.outlinePiece(piece, vb.users.getLocal().color, true);
			}

			//piece.pickedUp = true;
			//piece.user = vb.users.getLocal();
			//todo: enable the highlight
		},

		isEmpty: function () {
			return this.pieces.length == 0;
		},

		hasPiece: function (piece) {
			return this.pieceMap.hasOwnProperty(piece.id);
		},

		//triggered by mouse up
		clearAndSelect: function () {
			if (this.boxStart != null) {
				for (var i = 0; i < this.newPieces.length; i++) {
					this.addPiece(this.newPieces[i]);
				}
			}

			if(this.clearAndSetOnMouseUp === null) {
				return;
			}
			this.setPieces([this.clearAndSetOnMouseUp]);
			this.clearAndSetOnMouseUp = null;
		},

		//pieces in this.selectedPieces should be ordered based on depth
		//we cannot simply insert this piece at the end of the array
		addPiece: function (piece) {
			if(this.pieceMap.hasOwnProperty(piece.id)) {
				return;
			}
			this.pieceMap[piece.id] = this.pieces.length;
			this.pieces.push(piece);

			var pIndex = vb.board.pieceHash[piece.id];

			for(var i = this.pieces.length-1; i > 0; i--) {
				var p = this.pieces[i-1];

				if(vb.board.pieceHash[p.id] < pIndex) {
					break;
				}
				this.pieceMap[p.id] = i;
				this.pieceMap[piece.id] = i-1;
				this.pieces[i] = p;
				this.pieces[i-1] = piece;
			}
			vb.board.outlinePiece(piece, vb.users.getLocal().color, true);
		},

		removePiece: function (piece) {
			if(!this.pieceMap.hasOwnProperty(piece.id)) {
				return;
			}

			for(var i=this.pieceMap[piece.id]; i<this.pieces.length-1; i++) {
				var p = this.pieces[i+1];
				this.pieceMap[p.id] = i;
				this.pieces[i] = p;
			}
			vb.board.outlinePiece(piece, null, false);
			this.pieces.pop();
			delete this.pieceMap[piece.id];
		},

		//makes it so no pieces are currently selected
		clear: function () {
			if(this.pieces.length > 0) {
				for(var i=0; i<this.pieces.length; i++) {
					var piece = this.pieces[i];
					vb.board.outlinePiece(piece, null, false);
				}
				this.pieces = [];
				this.pieceMap = {};
			}
		},

		remove: function () {
			var ids = [];

			for(var i=0; i<this.pieces.length; i++) {
				var piece = this.pieces[i];
				ids.push(piece.id);
			}

			if(ids.length > 0) {
				vb.sessionIO.removePiece(ids);
			}
		},

		//attempts to flip all selected pieces
		flip: function () {
			var ids = [];

			for(var i=0; i<this.pieces.length; i++) {
				var piece = this.pieces[i];

				if(piece.isCard) {
					ids.push(piece.id);
				}
			}

			if(ids.length > 0) {
				vb.sessionIO.flipCard(ids);
			}
		},

		addToDeck: function (deck) {
			var ids = [];
			var decks = [];

			for(var i=0; i<this.pieces.length; i++) {
				var piece = this.pieces[i];

				if(piece.isCard) {
					ids.push(piece.id);
					decks.push(deck.id);
				}
			}

			if(ids.length > 0) {
				vb.sessionIO.addCardToDeck(ids, decks);
			}
		},

		dragBox: function(dx, dy) {
			if (this.boxStart != null) {
				for (var i = 0; i < this.newPieces.length; i++) {
					vb.board.outlinePiece(this.newPieces[i], null, false);
				}
				this.newPieces = [];
				this.boxEnd.x += dx;
				this.boxEnd.y += dy;

				for (var i = 0; i < vb.board.pieces.length; i++) {
					var piece = vb.board.pieces[i];
					var leftX = Math.min(this.boxStart.x, this.boxEnd.x);
					var rightX = Math.max(this.boxStart.x, this.boxEnd.x);
					var topY = Math.min(this.boxStart.y, this.boxEnd.y);
					var bottomY = Math.max(this.boxStart.y, this.boxEnd.y);

					var u = leftX - piece.position.x;
					var v = topY - piece.position.y;

					var upX = vb.camera.upVector.x;
					var upY = vb.camera.upVector.y;

					var dot = u * upX + v * upY;
					if (dot > 0) {
						continue;
					}

					dot = u * upY - v * upX;

					if (dot > 0) {
						continue;
					}

					var u = rightX - piece.position.x;
					var v = bottomY - piece.position.y;

					dot = u * upX + v * upY;

					if (dot < 0) {
						continue;
					}

					dot = u * upY - v * upX;

					if (dot < 0) {
						continue;
					}

					this.newPieces.push(piece);
					vb.board.outlinePiece(piece, vb.users.getLocal().color, true);
				}
			}
		},

		drag: function (dx, dy) {
			if(this.pieces.length == 0) {
				return;
			}
			var ids = [];
			var xs = [];
			var ys = [];

			for(var index = 0; index < this.pieces.length; index++) {
				var piece = this.pieces[index];
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

		startDragBox: function(pos) {
			vb.selection.boxStart = {"x": pos.x, "y": pos.y};
			vb.selection.boxEnd = {"x": pos.x, "y": pos.y};
			this.newPieces = [];
		}
	};
})(VBoard);
