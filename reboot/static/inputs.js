var VBoard = VBoard || {};
(function (vb) {

	vb.inputs = {
		//to do: separate system from polling buttons (wasd, etc) versus event buttons (backspace, space, etc)
		keysPressed: [],

		initialize: function () {
			window.addEventListener("resize", function () {
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
})(VBoard);
