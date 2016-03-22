var VBoard = VBoard || {};
(function (vb) {
	vb.selection = {
		pieces : [],

		//map from piece ids to the index in the pieces array
		pieceMap : {},

		//pieces should be in order from bottom element to top element
		//that way the order won't get jumbled as the pieces move
		setPieces: function (pieces) {
			//maybe this should be called first?
			this.removePieces();

			this.pieces = pieces;
			//piece.pickedUp = true;
			//piece.user = vb.users.getLocal();
			//todo: enable the highlight
		},

		//pieces in this.selectedPieces should be ordered based on depth
		//we cannot simply insert this piece at the end of the array
		addPiece: function (piece) {
			//TODO
			//needs to make sure that piece is not already contained in this.selectedPieces
		},

		removePieces: function () {
			if(this.pieces.length > 0) {
				//for(index in this.selectedPieces) {
					//this.selectedPieces[index].pickedUp = false;
					//this.selectedPieces[index].user = vb.users.getNone();

					//todo: disable the highlight
				// }
				this.pieces = [];
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
		}
	};
})(VBoard);
