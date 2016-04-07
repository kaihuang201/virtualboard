var VBoard = VBoard || {};
(function (vb) {

	vb.inputs = {
		inertia: 2000,

		//to do: separate system from polling buttons (wasd, etc) versus event buttons (backspace, space, etc)
		keysPressed: {},
		keyMap : {},
		mouseDown: false,
		lastDragX: 0,
		lastDragY: 0,
		isDraggingBox: false,
		inputsEnabled: true,

		handlers: {
			up: function (elapsed, dist) {
				vb.camera.position.y += dist * vb.camera.upVector.y;
				vb.camera.position.x += dist * vb.camera.upVector.x;
				vb.inputs.onMouseMove();
			},

			down: function (elapsed, dist) {
				vb.camera.position.y -= dist * vb.camera.upVector.y;
				vb.camera.position.x -= dist * vb.camera.upVector.x;
				vb.inputs.onMouseMove();
			},

			right: function (elapsed, dist) {
				vb.camera.position.y -= dist * vb.camera.upVector.x;
				vb.camera.position.x += dist * vb.camera.upVector.y;
				vb.inputs.onMouseMove();
			},

			left: function (elapsed, dist) {
				vb.camera.position.y += dist * vb.camera.upVector.x;
				vb.camera.position.x -= dist * vb.camera.upVector.y;
				vb.inputs.onMouseMove();
			},

			rotateCCW: function (elapsed, dist) {
				var u = vb.camera.upVector;
				var upX = u.x*Math.cos(-elapsed/vb.inputs.inertia) - u.y * Math.sin(-elapsed/vb.inputs.inertia);
				var upY = u.x*Math.sin(-elapsed/vb.inputs.inertia) + u.y * Math.cos(-elapsed/vb.inputs.inertia);
				vb.camera.upVector = new BABYLON.Vector3(upX, upY, 0);
				vb.inputs.onMouseMove();
			},

			rotateCW: function (elapsed, dist) {
				var u = vb.camera.upVector;
				var upX = u.x*Math.cos(elapsed/vb.inputs.inertia) - u.y * Math.sin(elapsed/vb.inputs.inertia);
				var upY = u.x*Math.sin(elapsed/vb.inputs.inertia) + u.y * Math.cos(elapsed/vb.inputs.inertia);
				vb.camera.upVector = new BABYLON.Vector3(upX, upY, 0);
				vb.inputs.onMouseMove();
			},

			flipPiece: function () {
				if(vb.selection.isEmpty()) {
					var piece = vb.inputs.getPieceUnderMouse(false, true);

					if(piece !== null && piece.isCard) {
						vb.sessionIO.flipCard(piece.id);
					}
				} else {
					vb.selection.flip();
				}
			},

			removePiece: function () {
				if(vb.selection.isEmpty()) {
					var piece = vb.inputs.getPieceUnderMouse(false, true);

					if(piece !== null) {
						vb.sessionIO.removePiece(piece.id);
					}
				} else {
					vb.selection.remove();
				}
			},

			//need to make sure this plays nicely with box selection too
			cancel: function () {
				vb.selection.clear();
			},

			resetCamera: function () {
				//resets the camera to default
				//or at least it would in theory if backspace didn't also go back a page
				vb.camera.position.x = 0;
				vb.camera.position.y = 0;
				vb.camera.upVector.x = 0;
				vb.camera.upVector.y = 1;
				vb.size = 10; //may need to be updated in the future
				vb.setCameraPerspective();
				vb.inputs.onMouseMove();
			}
		},

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
			//ideally this would work through our inputs system rather than jquery but whatever
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

			window.addEventListener("mouseup", function (event) {
				vb.inputs.onMouseUp(event);
			});
			window.addEventListener("mousemove", function (event) {
				vb.inputs.onMouseMove(event);
			});
			window.addEventListener("mousedown", function (event) {
				vb.inputs.onMouseDown(event);
			});
		},

		setEnabled: function (enabled) {
			this.inputsEnabled = enabled;
		},

		//mouse handlers
		onMouseUp: function (event) {
			this.mouseDown = false;
			this.isDraggingBox = false;

			vb.selection.clearAndSelect();

			if(!vb.selection.isEmpty()) {
				var piece = this.getPieceUnderMouse(true);

				if(piece && piece.isCard) {
					vb.selection.addToDeck(piece);
				}
				//vb.selection.clear();
			}
		},

		onMouseDown: function (event) {
			var pos = vb.board.screenToGameSpace(new BABYLON.Vector2(vb.scene.pointerX, vb.scene.pointerY));

			if(event.altKey) {
				vb.sessionIO.sendBeacon(pos.x, pos.y);
			} else {
				this.mouseDown = true;
				console.log("mouseDown: " + event.handled);

				this.lastDragX = pos.x;
				this.lastDragY = pos.y;

				if(!event.handled) {
					if (!event.shiftKey) {
						vb.selection.clear();
					}

					vb.selection.startDragBox(pos);
					this.isDraggingBox = true;
				}
			}
		},

		onMouseMove: function (event) {
			//TODO: needs rework
			if(vb.inputs.mouseDown) {
				vb.selection.clearAndSetOnMouseUp = null;
				var mousePos = vb.board.screenToGameSpace(new BABYLON.Vector2(vb.scene.pointerX, vb.scene.pointerY));
				this.onDrag(mousePos.x - vb.inputs.lastDragX, mousePos.y - vb.inputs.lastDragY);
				this.lastDragX = mousePos.x;
				this.lastDragY = mousePos.y;
			}
		},

		//dispatches key press events
		onKeyDown: function (key) {
			if(VBoard.inputs.inputsEnabled) {
				this.keysPressed[key] = true;

				if(this.keyMap.hasOwnProperty(key)) {
					keyData = this.keyMap[key];

					if(keyData.hasOwnProperty("press")) {
						keyData.press();
					}
				}	
			}
		},

		//dispatches key release events
		onKeyUp: function (key) {
			if(this.keysPressed.hasOwnProperty(key)) {
				delete this.keysPressed[key];
			}

			if(VBoard.inputs.inputsEnabled) {
				if(this.keyMap.hasOwnProperty(key)) {
					keyData = this.keyMap[key];

					if(keyData.hasOwnProperty("release")) {
						keyData.release();
					}
				}
			}
		},

		onScroll: function (delta) {
			var mousePos = vb.board.screenToGameSpace({
				x: vb.scene.pointerX,
				y: vb.scene.pointerY
			});
			this.adjustZoom(mousePos, delta);
		},

		adjustZoom: function (focusPos, delta) {
			//TODO: remove magic numbers
			//we should probably also call the mouse move handler here
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
			if (this.isDraggingBox) {
				vb.selection.dragBox(dx, dy)
			}
			else if(vb.selection.pieces.length > 0) {
				vb.selection.drag(dx, dy);
			}
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
				if(mesh.piece) {
					var piece = mesh.piece;

					if(ignoreSelection) {
						if(vb.selection.hasPiece(piece)) {
							return false;
						}
					}

					if(ignoreStatic) {
						return !piece.static;
					}
					return true;
				}
				return false;
			});

			if(pick.hit) {
				return pick.pickedMesh.piece;
			}
			return null;
		},

		onRightClick: function () {
			var piece = this.getPieceUnderMouse();

			if(piece) {
				vb.menu.createContextMenu(piece);
				return false;
			}
			return true;
		},

		//dispatches polling events
		processInputs: function (elapsed) {
			if(VBoard.inputs.inputsEnabled) {
				var dist = (elapsed / this.inertia) * vb.size;

				for(key in this.keysPressed) {
					if(this.keysPressed.hasOwnProperty(key)) {
						if(this.keyMap.hasOwnProperty(key)) {
							keyData = this.keyMap[key];

							if(keyData.hasOwnProperty("poll")) {
								keyData.poll(elapsed, dist);
							}
						}
					}
				}
			}
		},
	};

	//this needs to be done after, since we can't actually refer to vb.inputs otherwise
	vb.inputs.keyMap = {
		87 : {
			"poll" : vb.inputs.handlers.up
		},
		38 : {
			"poll" : vb.inputs.handlers.up
		},
		83 : {
			"poll" : vb.inputs.handlers.down
		},
		40 : {
			"poll" : vb.inputs.handlers.down
		},
		68 : {
			"poll" : vb.inputs.handlers.right
		},
		39 : {
			"poll" : vb.inputs.handlers.right
		},
		65 : {
			"poll" : vb.inputs.handlers.left
		},
		37 : {
			"poll" : vb.inputs.handlers.left
		},
		81 : {
			"poll" : vb.inputs.handlers.rotateCCW
		},
		69 : {
			"poll" : vb.inputs.handlers.rotateCW
		},
		70 : {
			"press" : vb.inputs.handlers.flipPiece
		},
		46 : {
			"release" : vb.inputs.handlers.removePiece
		},
		27 : {
			"release" : vb.inputs.handlers.cancel
		},
		8 : {
			"press" : vb.inputs.handlers.resetCamera
		},
		32 : {
			"press" : vb.inputs.handlers.resetCamera
		}
	};
})(VBoard);
