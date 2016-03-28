var VBoard = VBoard || {};
(function (vb) {

	vb.inputs = {
		//to do: separate system from polling buttons (wasd, etc) versus event buttons (backspace, space, etc)
		keysPressed: [],
		mouseDown: false,
		lastDragX: 0,
		lastDragY: 0,

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
				this.mouseDown = false;

				vb.selection.clearAndSelect();

				if(!vb.selection.isEmpty()) {
					var piece = vb.inputs.getPieceUnderMouse(true);

					if(piece !== null && piece.isCard) {
						vb.selection.addToDeck(piece);
					}
					//vb.selection.clear();
				}
			});

			window.addEventListener("mousemove", function (evt) {
				//TODO: needs rework
				if(this.mouseDown && vb.selection.pieces.length > 0) {
					vb.selection.clearAndSetOnMouseUp = null;
					var mousePos = vb.board.screenToGameSpace(new BABYLON.Vector2(vb.scene.pointerX, vb.scene.pointerY));
					vb.inputs.onDrag(mousePos.x - this.lastDragX, mousePos.y - this.lastDragY);
					this.lastDragX = mousePos.x;
					this.lastDragY = mousePos.y;
				}
			});

			window.addEventListener("mousedown", function (evt) {
				this.mouseDown = true;
				console.log("mouseDown: " + evt.handled);

				var pos = vb.board.screenToGameSpace(new BABYLON.Vector2(vb.scene.pointerX, vb.scene.pointerY));
				this.lastDragX = pos.x;
				this.lastDragY = pos.y;

				if(!evt.handled) {
					vb.selection.clear();
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
			vb.selection.drag(dx, dy);
		},

		getPieceUnderMouse: function (ignoreSelection, ignoreStatic) {
			if(ignoreSelection === void 0) {
				ignoreSelection = false;
			}

			if(ignoreStatic === void 0) {
				ignoreStatic = false;
			}

			//console.debug("get piece under mouse: " + ignoreSelection);

			var pick = vb.scene.pick(vb.scene.pointerX, vb.scene.pointerY, function (mesh) {
				if(ignoreSelection) {
					if(vb.selection.hasPiece(mesh.piece)) {
						return false;
					}
				}

				if(ignoreStatic) {
					return !mesh.piece.static;
				}
				return true;
			});

			if(pick.hit) {
				return pick.pickedMesh.piece;
			}
			return null;
		},

		onRightClick: function () {
			var piece = this.getPieceUnderMouse();

			if(piece !== null) {
				vb.menu.createContextMenu(piece);
				return false;
			}
			return true;
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
					case 70: //f
						if(vb.selection.isEmpty()) {
							var piece = this.getPieceUnderMouse(false, true);

							if(piece !== null && piece.isCard) {
								vb.sessionIO.flipCard(piece.id);
							}
						} else {
							vb.selection.flip();
						}
						break;
					case 46: //delete
						if(vb.selection.isEmpty()) {
							var piece = this.getPieceUnderMouse(false, true);

							if(piece !== null) {
								vb.sessionIO.removePiece(piece.id);
							}
						} else {
							vb.selection.remove();
						}
						break;
					case 27: //escape
						vb.selection.clear();
						break;
					case 8: //backspace
					case 32: //spacebar
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
