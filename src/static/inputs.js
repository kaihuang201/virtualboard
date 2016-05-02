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
		chatBoxActivated: false,
		addPrivateZoneNextClick: false,
		inputsEnabled: true,

		handlers: {
			/**
			* Called when the up arrow should be responded to, moves the camera up and simulates moving the mouse
			**/
			up: function (elapsed, dist) {
				vb.camera.position.y += dist * vb.camera.upVector.y;
				vb.camera.position.x += dist * vb.camera.upVector.x;
				vb.inputs.onMouseMove();
			},

			/**
			* Called when the down arrow should be responded to, moves the camera down and simulates moving the mouse
			**/
			down: function (elapsed, dist) {
				vb.camera.position.y -= dist * vb.camera.upVector.y;
				vb.camera.position.x -= dist * vb.camera.upVector.x;
				vb.inputs.onMouseMove();
			},

			/**
			* Called when the right arrow should be responded to, moves the camera right and simulates moving the mouse
			**/
			right: function (elapsed, dist) {
				vb.camera.position.y -= dist * vb.camera.upVector.x;
				vb.camera.position.x += dist * vb.camera.upVector.y;
				vb.inputs.onMouseMove();
			},

			/**
			* Called when the left arrow should be responded to, moves the camera left and simulates moving the mouse
			**/
			left: function (elapsed, dist) {
				vb.camera.position.y += dist * vb.camera.upVector.x;
				vb.camera.position.x -= dist * vb.camera.upVector.y;
				vb.inputs.onMouseMove();
			},

			/**
			* Called when the input for anti-clockwise rotation is active, 
			* rotates the camera and simulates moving the mouse
			**/
			rotateCCW: function (elapsed, dist) {
				var u = vb.camera.upVector;
				var upX = u.x*Math.cos(-elapsed/vb.inputs.inertia) - u.y * Math.sin(-elapsed/vb.inputs.inertia);
				var upY = u.x*Math.sin(-elapsed/vb.inputs.inertia) + u.y * Math.cos(-elapsed/vb.inputs.inertia);
				vb.camera.upVector = new BABYLON.Vector3(upX, upY, 0);
				vb.inputs.onMouseMove();
			},

			/**
			* Called when the input for clockwise rotation is active, 
			* rotates the camera and simulates moving the mouse
			**/
			rotateCW: function (elapsed, dist) {
				var u = vb.camera.upVector;
				var upX = u.x*Math.cos(elapsed/vb.inputs.inertia) - u.y * Math.sin(elapsed/vb.inputs.inertia);
				var upY = u.x*Math.sin(elapsed/vb.inputs.inertia) + u.y * Math.cos(elapsed/vb.inputs.inertia);
				vb.camera.upVector = new BABYLON.Vector3(upX, upY, 0);
				vb.inputs.onMouseMove();
			},

			/**
			* If pieces are selected flips any cards. If no pieces are selected, and there is
			* a card under the mouse, flips that card
			**/
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

			/**
			* If pieces are selected removes them. If no pieces are selected, and there is
			* a piece under the mouse, removes that piece
			**/
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

			/**
			* Cancels any mouse-based action that has been started
			**/
			cancel: function () {
				vb.selection.clear();

				if(this.addPrivateZoneNextClick) {
					this.addPrivateZoneNextClick = false;
					document.body.style.cursor = "";
				}
			},

			/**
			* Resets the camera to the initial position and rotation
			**/
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
			},

			/**
			* Increases size of targeted pieces
			**/
			biggify: function () {
				vb.inputs.handlers.resizePieces(vb.scalingFactor);
			},

			/**
			* Reduces size of targeted pieces
			**/
			smallify: function () {
				vb.inputs.handlers.resizePieces(1.0 / vb.scalingFactor);
			},

			/**
			* Resizes targeted pieces by gived factor
			**/
			resizePieces: function (factor) {
				var pieces = vb.inputs.getTargetedPieces(true);

				if(pieces.length > 0) {
					var ids = [];
					var sizes = [];

					for(var i=0; i<pieces.length; i++) {
						var piece = pieces[i];
						sizes.push(piece.size * factor);
						ids.push(piece.id);
					}
					vb.sessionIO.resizePiece(ids, sizes);
				}
			},

			/**
			* Rotates targeted pieces anti-clockwise
			*/
			rotatePieceCCW: function () {
				vb.inputs.handlers.rotatePieces(vb.rotationAmount);
			},

			/** 
			* Rotates targeted pieces clockwise
			**/
			rotatePieceCW: function () {
				vb.inputs.handlers.rotatePieces(-vb.rotationAmount);
			},

			/**
			* Rotates targeted pieces by given angle
			**/
			rotatePieces: function (rotation) {
				var pieces = vb.inputs.getTargetedPieces(true);

				if(pieces.length > 0) {
					var ids = [];
					var angles = [];

					for(var i=0; i<pieces.length; i++) {
						var piece = pieces[i];
						angles.push(piece.mesh.rotation.z + rotation);
						ids.push(piece.id);
					}
					vb.sessionIO.rotatePiece(ids, angles);
				}
			}
		},

		/**
		* Initializes all input listeners
		**/
		initialize: function () {
			window.addEventListener("resize", function () {
				vb.setCameraPerspective()
			});

			window.addEventListener("keydown", function (evt) {
				vb.inputs.onKeyDown(evt.keyCode);
			});

			//hide context menu when clicking on the canvas
			//ideally this would work through our inputs system rather than jquery but whatever
			$("#canvas").click(function () {
				$("#context-menu").css("visibility", "hidden");
				vb.inputs.setEnabled(true);
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

		/**
		* Sets whether inputs are enabled or not
		**/
		setEnabled: function (enabled) {
			this.inputsEnabled = enabled;
		},

		//mouse handlers

		/**
		* Called when mouse is released, triggers approriate actions
		**/
		onMouseUp: function (event) {
			this.mouseDown = false;
			this.isDraggingBox = false;

			if (vb.board.gridConfig.enabled) {
				for (var i in vb.selection.pieces) {
					var p = vb.selection.pieces[i];	
					vb.board.snapPieceToGrid(p);
				}
			}

			vb.selection.clearAndSelect();

			if(!vb.selection.isEmpty()) {
				var piece = this.getPieceUnderMouse(true);

				if(piece && piece.isCard) {
					vb.selection.addToDeck(piece);
				}
			}
		},

		/**
		* Called when mouse is pressed, triggers approriate actions
		**/
		onMouseDown: function (event) {
			var pos = vb.board.screenToGameSpace(new BABYLON.Vector2(vb.scene.pointerX, vb.scene.pointerY));

			if(event.altKey) {
				vb.sessionIO.sendBeacon(pos.x, pos.y);
			} else {
				if (this.addPrivateZoneNextClick) {
					vb.sessionIO.addPrivateZone(pos.x, pos.y, this.privateZoneWidth,
						this.privateZoneHeight, this.privateZoneColor);
					this.addPrivateZoneNextClick = false;
					document.body.style.cursor = "";
				} else if (this.removePrivateZoneNextClick) {
					zoneId = this.getZoneUnderMouse();
					console.log(zoneId);
					if (zoneId != null) {
						vb.sessionIO.removePrivateZone(zoneId);
					}
					this.removePrivateZoneNextClick = false;
					document.body.style.cursor = "";
				} else {
					this.mouseDown = true;

					this.lastDragX = pos.x;
					this.lastDragY = pos.y;

					if(!event.handled && !vb.internet_explorer_support_event_handled) {
						if (!event.shiftKey) {
							vb.selection.clear();
						}

						vb.selection.startDragBox(pos);
						this.isDraggingBox = true;
					}
				}
			}
			vb.internet_explorer_support_event_handled = false;
		},

		/**
		* Called when mouse is moved, triggers approriate actions
		**/
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

		/**
		* Called when mouse is scrolled, zooms the camera in or out
		**/
		onScroll: function (delta) {
			var mousePos = vb.board.screenToGameSpace({
				x: vb.scene.pointerX,
				y: vb.scene.pointerY
			});
			this.adjustZoom(mousePos, delta);
		},

		/**
		* Adjusts the zoom of the camera by the amount specified by delta, and centered at focusPos
		**/
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

		/**
		* Called when mouse is dragged (down and moved),
		* changes the selection box or moves selected pieces as approriate
		**/
		onDrag: function (dx, dy) {
			if (this.isDraggingBox) {
				vb.selection.dragBox(dx, dy)
			}
			else if(vb.selection.pieces.length > 0) {
				vb.selection.drag(dx, dy);
			}
		},

		/**
		* Returns selected pieces, if no pieces are selected return the piece under the mouse if there is one
		**/
		getTargetedPieces: function (ignoreStatic) {
			if(vb.selection.isEmpty()) {
				var piece = vb.inputs.getPieceUnderMouse(false, ignoreStatic);

				if(piece !== null) {
					return [piece];
				} else {
					return [];
				}
			} else {
				return vb.selection.pieces;
			}
		},

		/**
		* Returns the piece under the mouse if there is one, null otherwise
		**/
		getPieceUnderMouse: function (ignoreSelection, ignoreStatic) {
			if(ignoreSelection === void 0) {
				ignoreSelection = false;
			}

			if(ignoreStatic === void 0) {
				ignoreStatic = false;
			}

			var pick = vb.scene.pick(vb.scene.pointerX, vb.scene.pointerY, function (mesh) {
				if(mesh.piece) {
					var piece = mesh.piece;

					if(piece.hidden) {
						return false;
					}

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

		/**
		* Returns the private zone under the mouse if there is one, null otherwise
		**/
		getZoneUnderMouse: function () {
			var pick = vb.scene.pick(vb.scene.pointerX, vb.scene.pointerY, function (mesh) {
				if(mesh.hasOwnProperty("zone")) {
					return true;
				}
				return false;
			});

			if(pick.hit) {
				return pick.pickedMesh.zone;
			}
			return null;
		},

		/**
		* Called on a right click, opens a context menu for the piece under the mouse, if there is one
		**/
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

		/**
		* Changes the mouse cursor to a crosshair, and prepares to create a private zone on the next click
		**/
		prepAddPrivateZone: function(width, height, color) {
			this.privateZoneWidth = width;
			this.privateZoneHeight = height;
			this.privateZoneColor = color;
			this.addPrivateZoneNextClick = true;
			document.body.style.cursor = "crosshair";
		},

		/**
		* Changes the mouse cursor to a crosshair, and prepares to remove a private zone on the next click
		**/
		prepRemovePrivateZone: function() {
			this.removePrivateZoneNextClick = true;
			document.body.style.cursor = "crosshair";
		}
	};

	//this needs to be done after, since we can't actually refer to vb.inputs otherwise
	vb.inputs.keyMap = {
		//w
		87 : {
			"poll" : vb.inputs.handlers.up
		},
		//up
		38 : {
			"poll" : vb.inputs.handlers.up
		},
		//s
		83 : {
			"poll" : vb.inputs.handlers.down
		},
		//down
		40 : {
			"poll" : vb.inputs.handlers.down
		},
		//d
		68 : {
			"poll" : vb.inputs.handlers.right
		},
		//right
		39 : {
			"poll" : vb.inputs.handlers.right
		},
		//a
		65 : {
			"poll" : vb.inputs.handlers.left
		},
		//left
		37 : {
			"poll" : vb.inputs.handlers.left
		},
		//q
		81 : {
			"poll" : vb.inputs.handlers.rotateCCW
		},
		//e
		69 : {
			"poll" : vb.inputs.handlers.rotateCW
		},
		//f
		70 : {
			"press" : vb.inputs.handlers.flipPiece
		},
		//delete
		46 : {
			"release" : vb.inputs.handlers.removePiece
		},
		//escape
		27 : {
			"release" : vb.inputs.handlers.cancel
		},
		//backspace
		8 : {
			"press" : vb.inputs.handlers.resetCamera
		},
		//space
		32 : {
			"press" : vb.inputs.handlers.resetCamera
		},
		//equals sign/plus sign
		187 : {
			"press" : vb.inputs.handlers.biggify
		},
		//minus sign/underscore
		189 : {
			"press" : vb.inputs.handlers.smallify
		},
		//r
		82: {
			"press" : vb.inputs.handlers.rotatePieceCCW
		},
		//t
		84: {
			"press" : vb.inputs.handlers.rotatePieceCW
		}
	};
})(VBoard);
