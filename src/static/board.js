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
		backgroundNameMap: {},

		//key - a texture url that has been reqested
		//value - a set of piece objects waiting on this texture
		pendingTextures: {},

		//a map from texture urls to texture objects
		//fully loaded textures only
		textureMap: {},
		unknownTexture: null,

		background: null,
		selectionBox: null,

		gridConfig: {
			enabled: false,
			scale: 2,
			aspect: 1, // height / width
			originX: 1, // grind origin in world coordinates
			originY: 1,
			sensitivity: 1 // Snap only if the sqr_dist between the piece and the grid point is below this value
		},

		snapPieceToGrid : function(piece) {
			closestGridPos = this.getClosestGridPos(piece.position.x, piece.position.y);
			
			if(this.getIsWithinSensitivity(piece, closestGridPos)) {
				clearTimeout(piece.predictTimeout);

				piece.mesh.position.x = closestGridPos.x;
				piece.mesh.position.y = closestGridPos.y;

				piece.predictTimeout = setTimeout(function () {
					vb.board.undoPrediction(piece);
					piece.predictTimeout = null;
				}, vb.predictionTimeout);
				vb.sessionIO.movePiece(piece.id, closestGridPos.x, closestGridPos.y);
			}
		},

		getIsWithinSensitivity : function(piece, closestGridPos) {
			sqr_dist = (piece.position.x - closestGridPos.x) * (piece.position.x - closestGridPos.x) +
			        (piece.position.y - closestGridPos.y) * (piece.position.y - closestGridPos.y);

			return (sqr_dist < this.gridConfig.sensitivity);
		},

		getClosestGridPos : function(pieceX, pieceY) {
			var pieceX = pieceX - this.gridConfig.originX;
			var pieceY = pieceY - this.gridConfig.originY;

			var closestGridX = Math.round(pieceX / this.gridConfig.scale);
			var closestGridY = Math.round(pieceY / this.gridConfig.scale * this.gridConfig.aspect)

			var closestX = closestGridX * this.gridConfig.scale + this.gridConfig.originX
			var closestY = closestGridY * this.gridConfig.scale * this.gridConfig.aspect + this.gridConfig.originY

			return {x: closestX, y: closestY} 
		},

		//methods

		//adds a new piece to the front of the board
		//should only be called by the generateNewPiece() method
		add: function (piece) {
			this.pieceHash[piece.id] = this.pieces.length;
			this.pieces.push(piece);
			var z = this.getZIndex(this.pieces.length-1);
			piece.mesh.position.z = z;
		},

		addPrivateZone: function (zoneData) {
			var c = zoneData["color"];

			var plane = BABYLON.Mesh.CreatePlane("plane", 1.0, vb.scene);
			var material = new BABYLON.StandardMaterial("std", vb.scene);

			material.emissiveColor = new BABYLON.Color3(c[0]/255, c[1]/255, c[2]/255);
			material.disableLighting = true;
			plane.material = material;
			plane.position.x = zoneData["pos"][0];
			plane.position.y = zoneData["pos"][1];
			plane.position.z = 12; // Higher z-index than any piece will have, max for pieces is 11
			plane.scaling.x = zoneData["size"][0];
			plane.scaling.y = zoneData["size"][1];
			plane.rotation.z = zoneData["r"];
			plane.zone = zoneData["id"];

			this.privateZones[zoneData["id"]] = plane;

			this.registerStaticMesh(plane);
		},

		removePrivateZone: function (zoneData) {
			var id = zoneData["id"];
			this.removePrivateZoneID(id);
		},

		removePrivateZoneID: function (id) {
			this.privateZones[id].dispose();
			delete this.privateZones[id];
			vb.backStaticMeshCount--;
		},

		//TODO: The whole "always private" thing is not implemented yet
		enterPrivateZone: function (piece_id, zone_id) {
			var piece = this.getFromID(piece_id);
			piece.zones[zone_id] = true;
			var zone = this.privateZones[zone_id];
			var zcolor = zone.material.emissiveColor;
			var mycolor = vb.users.getLocal().color;

			if(zcolor.r == mycolor.r && zcolor.g == mycolor.g && zcolor.b == mycolor.b) {
				this.showPiece(piece);
				return;
			}

			if(Object.keys(piece.zones).length > 1) {
				return;
			}
			this.hidePiece(piece);
		},

		leavePrivateZone: function (piece_id, zone_id) {
			var piece = this.getFromID(piece_id);
			delete piece.zones[zone_id];

			//if the object is no longer in a private zone we always show it
			if(Object.keys(piece.zones).length == 0) {
				this.showPiece(piece);
				return;
			}
			mycolor = vb.users.getLocal().color;

			for(zid in piece.zones) {
				if(piece.zones.hasOwnProperty(zid)) {
					var zone = this.privateZones[zid]
					var zcolor = zone.material.emissiveColor;

					if(zcolor.r == mycolor.r && zcolor.g == mycolor.g && zcolor.b == mycolor.b) {
						this.showPiece(piece);
						return;
					}
				}
			}
			this.hidePiece(piece);
		},

		showPiece: function (piece) {
			//TODO: register/unregister event action
			piece.mesh._isEnabled = true;
			piece.hidden = false;
			this.addClickAction(piece);
		},

		hidePiece: function (piece) {
			piece.mesh._isEnabled = false;
			piece.hidden = true;
			this.removeClickAction(piece);

			vb.selection.removePiece(piece);
			vb.sessionIO.moveBuffer.remove(piece.id);
			vb.selection.computeBoxSelection();
		},

		privateZoneContains: function (zone, x, y) {

			ax = zone.position.x + ((zone.scaling.y / 2.0) * -Math.sin(zone.rotation.z) - (zone.scaling.x / 2.0) * Math.cos(zone.rotation.z));
			ay = zone.position.y + ((zone.scaling.y / 2.0) * Math.cos(zone.rotation.z) - (zone.scaling.x / 2.0) * Math.sin(zone.rotation.z));
			bx = ax + zone.scaling.x * Math.cos(zone.rotation.z);
			dx = ax + zone.scaling.y * Math.sin(zone.rotation.z);
			by = ay + zone.scaling.x * Math.sin(zone.rotation.z);
			dy = ay - zone.scaling.y * Math.cos(zone.rotation.z);

			bax = bx - ax;
			bay = by - ay;
			dax = dx - ax;
			day = dy - ay;

			if ((x - ax) * bax + (y - ay) * bay < 0.0)
				return false;
			if ((x - bx) * bax + (y - by) * bay > 0.0)
				return false;
			if ((x - ax) * dax + (y - ay) * day < 0.0)
				return false;
			if ((x - dx) * dax + (y - dy) * day > 0.0)
				return false;

			return true;
		},

		registerStaticMesh: function (mesh, front) {
			if(front === void(0)) {
				front = false;
			}

			for(var index = vb.scene.meshes.length-1; index >= 0; index--) {
				if(vb.scene.meshes[index].uniqueId == mesh.uniqueId) {
					if(front) {
						for(var i = index; i < vb.scene.meshes.length-1; i++) {
							vb.scene.meshes[i] = vb.scene.meshes[i+1];
						}
						vb.scene.meshes[vb.scene.meshes.length-1] = mesh;
						vb.frontStaticMeshCount++;
					} else {
						var i;
						for(i = index; i > vb.backStaticMeshCount; i--) {
							vb.scene.meshes[i] = vb.scene.meshes[i-1];
						}
						vb.scene.meshes[i] = mesh;
						vb.backStaticMeshCount++;
					}
					return;
				}
			}
			console.log("failed to register mesh: " + mesh.uniqueId);
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
			vb.selection.removePiece(piece);

			//if the deleted piece is currently being selected by a drag box
			//  the easiest solution is to clear the drag box selection before removing
			//  then recompute the selected pieces
			vb.selection.resetBoxSelection();

			//we should call bringToFront instead of doing this probably
			var index = this.ourIndexOf(piece);

			for(var i = index; i < this.pieces.length-1; i++) {
				var p = this.pieces[i+1];
				this.pieceHash[p.id] = i;
				this.pieces[i] = p;
				p.mesh.position.z = this.getZIndex(i);
			}

			clearTimeout(piece.highlightTimeout);
			clearTimeout(piece.predictTimeout);
			vb.sessionIO.moveBuffer.remove(piece.id);

			if(this.pendingTextures.hasOwnProperty(piece.icon)) {
				delete this.pendingTextures[piece.icon][piece.id];
			}

			this.pieces.pop();
			delete this.pieceHash[piece.id];
			piece.mesh.dispose();

			//reselect deselected pieces
			vb.selection.computeBoxSelection();
		},

		verifySceneIndex: function (index, piece) {
			var meshes = vb.scene.meshes;
			index += vb.backStaticMeshCount;

			if(index < meshes.length) {
				var mesh = meshes[index];

				if(mesh && mesh.piece && mesh.piece.id == piece.id) {
					return index;
				}
			}
			console.log("missed index for piece: " + piece.id);

			for(var i=0; i<meshes.length; i++) {
				var mesh = meshes[i];

				if(mesh && mesh.piece && mesh.piece.id == piece.id) {
					return i;
				}
			}
			console.log("completely missed piece");
			return -1;
		},

		//moves a piece to the back of the board (highest z index)
		pushToBack: function (piece) {
			var index = this.ourIndexOf(piece);
			var sceneIndex = this.verifySceneIndex(index, piece);
			var mesh = vb.scene.meshes[sceneIndex];

			for(var i = index; i > 0; i--) {
				var p = this.pieces[i-1];
				this.pieceHash[p.id] = i;
				this.pieces[i] = p;
				p.mesh.position.z = this.getZIndex(i);

				//also update babylon mesh ordering
				var m = vb.scene.meshes[sceneIndex - 1];
				vb.scene.meshes[sceneIndex] = m;
				sceneIndex--;
			}
			this.pieceHash[piece.id] = 0;
			this.pieces[0] = piece;
			piece.mesh.position.z = this.getZIndex(0);

			vb.scene.meshes[sceneIndex] = mesh;
		},

		//moves a piece to the front of the board (lowest z index)
		bringToFront: function (piece) {
			var index = this.ourIndexOf(piece);
			var sceneIndex = this.verifySceneIndex(index, piece);
			var mesh = vb.scene.meshes[sceneIndex];

			for(var i = index; i < this.pieces.length-1; i++) {
				var p = this.pieces[i+1];
				this.pieceHash[p.id] = i;
				this.pieces[i] = p;
				p.mesh.position.z = this.getZIndex(i);

				//also update babylon mesh ordering
				var m = vb.scene.meshes[sceneIndex + 1];
				vb.scene.meshes[sceneIndex] = m;
				sceneIndex++;
			}

			var end = this.pieces.length-1;
			this.pieceHash[piece.id] = end;
			this.pieces[end] = piece;
			piece.mesh.position.z = this.getZIndex(end);

			vb.scene.meshes[sceneIndex] = mesh;
		},

		//toggles whether a piece should be static or not
		//should not be used
		//toggleStatic: function (piece) {
		//	piece.static = !piece.static;
		// },

		//called by web socket handler upon receiving an update
		transformPiece: function (pieceData) {
			var index = this.pieceHash[pieceData["piece"]];
			var piece = this.pieces[index];
			var user = vb.users.userList[pieceData["user"]];

			this.highlightPiece(piece, user.color, vb.moveHighlightDuration);

			if(pieceData.hasOwnProperty("color")) {
				var c = pieceData["color"];
				piece.color = new BABYLON.Color3(c[0]/255, c[1]/255, c[2]/255);
				piece.mesh.material.mainMaterial.diffuseColor = piece.color;
			}

			if(pieceData.hasOwnProperty("icon")) {
				if(piece.isUserPicker) {
					piece.max = vb.users.userList.length;

					//edge case: picked user might no longer be in game
					if(vb.users.userList.hasOwnProperty(piece.icon)) {
						var color = vb.users.userList[piece.icon].color;
					} else {
						var color = new BABYLON.Color3(1.0, 1.0, 1.0);
					}
					this.setColor(piece, color);
				} else {
					this.setIcon(piece, pieceData["icon"]);
				}
			}

			if(pieceData.hasOwnProperty("pos")) {
				this.bringToFront(piece);
				piece.position.x = pieceData["pos"][0];
				piece.position.y = pieceData["pos"][1];

				if(!user.isLocal) {
					vb.selection.removePiece(piece);
				}

				if(piece.predictTimeout === null) {
					//if we have no expectation for this piece's position
					//then we should update the mesh's position immediately, regardless of who moved it

					if(piece.hidden) {
						if(this.smoothedPieces.hasOwnProperty(piece.id)) {
							delete this.smoothedPieces[piece.id];
						}
						piece.mesh.position.x = pieceData["pos"][0];
						piece.mesh.position.y = pieceData["pos"][1];
					} else {
						this.smoothTransition(piece); //, pieceData["pos"][0], pieceData["pos"][1]);
					}
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
				piece.size = pieceData["s"];
				piece.mesh.scaling.y = pieceData["s"];
				this.adjustPieceWidth(piece);
			}

			if(pieceData.hasOwnProperty("static")) {
				piece.static = pieceData["static"] == 1;

				if(piece.static) {
					this.removeClickAction(piece);
				} else {
					this.addClickAction(piece);
				}
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

		drawSelectionBox: function (corner1, corner2) {
			var up = vb.camera.upVector;
			var centerX = (corner1.x + corner2.x)/2;
			var centerY = (corner1.y + corner2.y)/2;
			var screenCorner1 = this.rotateToCameraSpace(corner1);
			var screenCorner2 = this.rotateToCameraSpace(corner2);
			var width = Math.abs(screenCorner1.x - screenCorner2.x);
			var height = Math.abs(screenCorner1.y - screenCorner2.y);

			//TODO: FINISH
			this.selectionBox.rotation.z = -Math.atan2(up.x, up.y);
			this.selectionBox.position.x = centerX;
			this.selectionBox.position.y = centerY;
			this.selectionBox.scaling.x = width;
			this.selectionBox.scaling.y = height;
			this.selectionBox.showBoundingBox = true;
		},

		hideSelectionBox: function () {
			this.selectionBox.showBoundingBox = false;
		},

		splitLines: function (text, lineSize) {
			var words = text.split(" ");
			var lines = [];
			var lineBuffer = "";
			for (w in words) {

				var word = words[w];
				var lenWord = word.length;
				var noNeedForSpace = false;

				if (lineBuffer.length + lenWord + 1 > lineSize) {
					if (lineBuffer.length > 0) {
						lines.push(lineBuffer);
					}
					lineBuffer = "";
				}

				while (word.length >= lineSize) {
					var seg = word.slice(0, lineSize-1) + "-";
					lines.push(seg);
					word = word.slice(lineSize-1);
					noNeedForSpace = true;
				}

				if(lineBuffer.length > 0 && !noNeedForSpace) { 
					lineBuffer += " " + word;
				} else {
					lineBuffer += word;
				}
			}
			if (lineBuffer.length > 0) {
				lines.push(lineBuffer);
			}

			return lines;
		},

		//takes JSON formatted data from socket handler
		generateNewPiece: function (pieceData) {
			var piece = {};

			piece.size = pieceData["s"];
			var c = pieceData["color"];
			piece.color = new BABYLON.Color3(c[0]/255, c[1]/255, c[2]/255);

			var plane = BABYLON.Mesh.CreatePlane("plane", 1.0, vb.scene);

			//we need to move this piece behind static meshes being rendered in the front
			for(var i=vb.scene.meshes.length-1; i >= vb.scene.meshes.length-vb.frontStaticMeshCount; i--) {
				vb.scene.meshes[i] = vb.scene.meshes[i-1];
				vb.scene.meshes[i-1] = plane;
			}
			plane.scaling.y = piece.size;
			plane.scaling.x = piece.size;
			var subMaterial = new BABYLON.StandardMaterial("std", vb.scene);
			var infoMaterial = new BABYLON.StandardMaterial("std", vb.scene);
			var infoTexture = new BABYLON.DynamicTexture("info", 512, vb.scene, true);
			infoTexture.hasAlpha = true;
			infoMaterial.diffuseTexture = infoTexture;
			infoMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
			infoMaterial.emissiveColor = piece.color;
			var material = new BABYLON.MultiMaterial("multi", vb.scene);
			material.subMaterials.push(subMaterial);
			material.subMaterials.push(infoMaterial);
			material.mainMaterial = subMaterial;
			material.infoTexture = infoTexture;
			material.mainMaterial.diffuseColor = piece.color;

			plane.position = new BABYLON.Vector3(pieceData["pos"][0], pieceData["pos"][1], 0);
			plane.rotation.z = pieceData["r"];
			plane.piece = piece;
			plane.material = material;

			plane.subMeshes = [];
			plane.subMeshes.push(new BABYLON.SubMesh(0, 0, 4, 0, 6, plane));
			plane.subMeshes.push(new BABYLON.SubMesh(1, 0, 4, 0, 6, plane));

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
			piece.isUserPicker = false;
			piece.isTimer = false;
			piece.isNote = false;
			piece.isRunning = false;
			piece.time = 0;
			piece.lastTrigger = 0;
			piece.zones = {};
			piece.hidden = false;
			piece.icon = pieceData["icon"];

			if(pieceData.hasOwnProperty("diceData")) {
				piece.isDie = true;
				piece.max = pieceData["diceData"]["max"];
				piece.faces = pieceData["diceData"]["faces"];

				if(pieceData["diceData"].hasOwnProperty("isUserPicker")) {
					piece.isUserPicker = pieceData["diceData"]["isUserPicker"];
				} else {
					piece.isUserPicker = false;
				}
			}

			if(!pieceData.hasOwnProperty("timerData") && !piece.isUserPicker) {
				this.setIcon(piece, piece.icon);
				this.setInfo(piece, "", 256, 128, 512, 512);
			}

			if(pieceData.hasOwnProperty("noteData")) {
				piece.isNote = true;
				var noteText = pieceData["noteData"]["text"];
				var noteTextSize = pieceData["noteData"]["size"];
				this.setNoteData(piece, noteText, noteTextSize);
			}

			if(pieceData.hasOwnProperty("cardData")) {
				piece.isCard = true;

				if(pieceData["cardData"].hasOwnProperty("count")) {
					vb.board.setCardCount(piece, pieceData["cardData"]["count"]);
				} else {
					vb.board.setCardCount(piece, 1);
				}
			}

			if(pieceData.hasOwnProperty("timerData")) {
				piece.isTimer = true;
				piece.time = pieceData["timerData"]["time"];
				piece.mesh.scaling.y = piece.size;
				piece.mesh.scaling.x = piece.size / 0.35;
				this.setTimer(piece, piece.time, false);
			}

			if(piece.isUserPicker) {
				piece.max = vb.users.userList.length;

				//edge case: picked user might no longer be in game
				if(vb.users.userList.hasOwnProperty(piece.icon)) {
					var color = vb.users.userList[piece.icon].color;
				} else {
					var color = new BABYLON.Color3(1.0, 1.0, 1.0);
				}
				this.setColor(piece, color);
			}

			plane.actionManager = new BABYLON.ActionManager(vb.scene);

			if(!piece.static) {
				this.addClickAction(piece);
			}

			this.add(piece);

			if(pieceData.hasOwnProperty("user")) {
				var user = vb.users.userList[pieceData["user"]];
				this.highlightPiece(piece, user.color, vb.addHighlightDuration);
			}

			//check to see if piece is created in a private zone
			for(var zone_id in this.privateZones) {
				if(this.privateZones.hasOwnProperty(zone_id)) {
					var zone = this.privateZones[zone_id];

					if(this.privateZoneContains(zone, piece.position.x, piece.position.y)) {
						this.enterPrivateZone(piece.id, zone_id);
					}
				}
			}
			return piece;
		},

		addClickAction: function (piece) {
			if(piece.mesh.actionManager.actions.length > 0) {
				return;
			}

			//TODO: instead of attaching a code action to each piece
			//		we should just have a scene.pick trigger in a global event listener
			//		We also should be able to right click anywhere to bring up a menu
			//		that lets us add a piece at that location.

			//TODO: do not register if static, make a register/unregister block in transformPiece
			piece.mesh.actionManager.registerAction(
				new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnLeftPickTrigger, function (evt) {
					if(piece.hidden == false && piece.static == false && !evt.sourceEvent.altKey) {

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

						vb.internet_explorer_support_event_handled = true;
					}
				})
			);
		},

		removeClickAction: function (piece) {
			piece.mesh.actionManager.actions = [];
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

			for (var id in this.privateZones) {
				if (this.privateZones.hasOwnProperty(id)) {
					this.removePrivateZoneID(id);
				}
			}
			//bad practice, probably leaks memory, oh well
			this.setBackground("");
		},

		getCenter: function () {
			return new BABYLON.Vector2(0, 0);
		},

		//TODO: this seems to break when opening/closing the developer console
		screenToGameSpace: function (position) {
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

			return new BABYLON.Vector2(totalX, totalY);
		},

		rotateToCameraSpace: function (pos) {
			var up = vb.camera.upVector;
			var x = pos.x * up.y - pos.y * up.x;
			var y = pos.x * up.x + pos.y * up.y;
			return {"x" : x, "y" : y};
		},

		setBackground: function (icon) {
			//TODO: set background
			var backgroundMaterial = new BABYLON.StandardMaterial("backgroundMat", vb.scene);
			backgroundMaterial.diffuseTexture = new BABYLON.Texture(icon, vb.scene);
			vb.board.background.material = backgroundMaterial;
			vb.board.background.name = icon;
		},

		loadBoardData: function (boardData) {
			this.setBackground(boardData["background"]);

			var pieces = boardData["pieces"];
			var privateZones = boardData["privateZones"];

			for (var index in privateZones) {
				var zoneData = privateZones[index];
				this.addPrivateZone(zoneData);
			}

			//TODO: it turns out for ... in does not guarantee any particular order, so this should be rewritten
			for(var index in pieces) {
				var pieceData = pieces[index];
				this.generateNewPiece(pieceData);
			}
		},

        /**
         * Set a piece to a solid color
         * @piece a piece object
         * @color BABYLON.Color3
         */
        setColor: function (piece, color) {
			piece.mesh.material.mainMaterial.diffuseColor = color;
        },

		//TODO: maybe a toggle for auto resizing
		setIcon: function (piece, icon) {
			if(this.pendingTextures.hasOwnProperty(piece.icon)) {
				delete this.pendingTextures[piece.icon][piece.id];
			}
			piece.icon = icon;

			if(this.textureMap.hasOwnProperty(icon)) {
				piece.mesh.material.mainMaterial.diffuseTexture = this.textureMap[icon];
				vb.board.adjustPieceWidth(piece);
			} else {
				if(!this.pendingTextures.hasOwnProperty(icon)) {
					this.pendingTextures[icon] = {};

					var texture = new BABYLON.Texture(icon, vb.scene, void(0), void(0), void(0), function () {
						//onload
						vb.board.textureMap[icon] = texture;
						texture.hasAlpha = true;

						for(var pieceID in vb.board.pendingTextures[icon]) {
							if(vb.board.pendingTextures[icon].hasOwnProperty(pieceID)) {
								var index = vb.board.pieceHash[pieceID];
								var p = vb.board.pieces[index];
								p.mesh.material.mainMaterial.diffuseTexture = texture;
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
				piece.mesh.material.mainMaterial.diffuseTexture = this.unknownTexture;
			}
		},

		adjustPieceWidth: function (piece) {
			if(piece.isTimer) {
				piece.mesh.scaling.x = piece.size / 0.35;
			} else {
				if(piece.mesh.material.mainMaterial && piece.mesh.material.mainMaterial.diffuseTexture) {
					var t = piece.mesh.material.mainMaterial.diffuseTexture._texture;
					//for some bizzare reason, not using the intermediate ratio variable makes this not work
					var ratio = t._baseWidth / t._baseHeight;
				} else {
					var ratio = 1.0;
				}
				piece.mesh.scaling.x = piece.mesh.scaling.y * ratio;
			}
		},

		//beacons
		//linked list because meh
		headBeacon: null,

		beacon: function (beaconData) {
			var x = beaconData["pos"][0];
			var y = beaconData["pos"][1];
			var user_id = beaconData["user"];
			var user = vb.users.userList[user_id];

			var beacon = new BABYLON.Mesh.CreatePlane("beacon", 1.0, vb.scene);
			beacon.position.x = x;
			beacon.position.y = y;
			beacon.material = new BABYLON.StandardMaterial("beacon", vb.scene);
			beacon.material.diffuseTexture = new BABYLON.Texture("/static/img/ping.png", vb.scene);
			beacon.material.diffuseTexture.hasAlpha = true;
			beacon.material.useAlphaFromDiffuseTexture = true;
			beacon.material.diffuseColor = user.color;
			beacon.material.alpha = 1.0;
			this.registerStaticMesh(beacon, true);
			var beaconEntry =  {
				"beacon" : beacon,
				"startTime" : vb.simTime,
				"next" : this.headBeacon
			};
			this.headBeacon = beaconEntry;
		},

		updateBeacons: function (dt) {
			var prev = null;
			var beacon = this.headBeacon;
			var FADETIME = 250;
			var CYCLETIME = 1000;
			var CYCLES = 2;

			while(beacon !== null) {
				var delta = vb.simTime - beacon.startTime;

				if(delta > CYCLES*CYCLETIME) {
					beacon.beacon.dispose();
					vb.frontStaticMeshCount--;

					if(prev === null) {
						this.headBeacon = beacon.next;
					} else {
						prev.next = beacon.next;
					}
				} else {
					if(delta < FADETIME) {
						beacon.beacon.material.alpha = delta / FADETIME;
					} else if(CYCLES * CYCLETIME - delta < FADETIME) {
						beacon.beacon.material.alpha = (CYCLES * CYCLETIME - delta) / FADETIME;
					} else {
						beacon.beacon.material.alpha = 1.0;
					}

					var currCycleDelta = delta % CYCLETIME;

					if(currCycleDelta < CYCLETIME/2) {
						var scaling = 1.0 + currCycleDelta / (CYCLETIME/2);
						beacon.beacon.scaling.x = scaling;
						beacon.beacon.scaling.y = scaling;
					} else {
						var scaling = 3.0 - currCycleDelta / (CYCLETIME/2);
						beacon.beacon.scaling.x = scaling;
						beacon.beacon.scaling.y = scaling;
					}
					prev = beacon;
				}
				beacon = beacon.next;
			}
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

		setTimer: function(timer, time, running){
			var minutes = Math.floor(time / 60);
			var seconds = time % 60;
			var minutesString = minutes.toString();
			var secondsString = seconds.toString();
			if(minutes < 10){
				minutesString = "0" + minutesString;
			}
			if(seconds < 10){
				secondsString = "0" + secondsString;
			}
			timer.time = time;
			timer.isRunning = (running == 0) ? false : true;
			this.setInfo(timer, minutesString + ":" + secondsString, 40, 300, 512, 1024);
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

			if (piece.isUserPicker) {
				piece.icon = value; //bleh
				piece.max = vb.users.userList.length;
				var color = vb.users.userList[value].color;
				this.setColor(piece, color);
			} else {
				if(value < piece.faces.length) {
					icon = piece.faces[value];
				} else {
					//A six sided die will return 0-5 inclusive
					if (piece.max < 3) {
						icon = "/static/img/die_face/tiny_die_face_" + (value+1) + ".png";
					}
					else if(piece.max < 7) {
						icon = "/static/img/die_face/small_die_face_" + (value+1) + ".png";
					} else {
						icon = "/static/img/die_face/big_die_face_" + (value+1) + ".png";
					}
				}
				this.setIcon(piece, icon);				
			}
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

			if(newCount > 1) {
				this.setInfo(piece, newCount.toString(), 256, 128, 512, 512);
			} else {
				this.setInfo(piece, "", 256, 128, 512, 512);
			}
		},

		//TODO: BARELY WORKS, NEEDS OVERHAUL
		setInfo: function (piece, info, X, Y, width, height) {
			//http://www.html5gamedevs.com/topic/8958-dynamic-texure-drawtext-attributes-get-text-to-wrap/?do=findComment&comment=62014
			function wrapText(context, text, x, y, maxWidth, lineHeight) {
				var words = text.split(' ');
				var line = '';
				for(var n = 0; n < words.length; n++) {
					var testLine = line + words[n] + ' ';
					var metrics = context.measureText(testLine);
					var testWidth = metrics.width;
					if (testWidth > maxWidth && n > 0) {
						context.fillText(line, x, y);
						line = words[n] + ' ';
						y += lineHeight;
					} else {
						line = testLine;
					}
				}
				context.fillText(line, x, y);
			}
			var tex = piece.mesh.material.infoTexture;
			var context = tex.getContext();
			context.clearRect(0, 0, 512, 512);
			context.font = "140px verdana";
			context.save();
			context.textAlign = "start";
			context.shadowColor = "white";
			context.shadowOffsetY = 5;
			context.shadowOffsetX = 5;
			wrapText(context, info, X, Y, width, height);
			context.restore();
			tex.update();
		},

		setNoteData: function (piece, text, size) {
			var tex = piece.mesh.material.infoTexture;
			var context = tex.getContext();
			context.clearRect(0, 0, 512, 512);

			piece.noteText = text
			piece.noteTextSize = size
			var lineSize = Math.floor(750.0/piece.noteTextSize);
			var lines = this.splitLines(piece.noteText, lineSize);
			var line;
			var offset = piece.noteTextSize;
			var textFormat = "" + piece.noteTextSize + "px Courier New";
			for(line in lines) {
				piece.mesh.material.infoTexture.drawText(lines[line], 0, offset, textFormat, "black" , "transparent", true);
				offset += piece.noteTextSize*1.1;
			}
		},

		doubleClick: function(piece) {
			//TODO: I think a double click + drag on a deck should pick up the deck
			//		a single click + drag simply draws the top card off the deck
			if(piece.isCard) {
				if(piece.numCards > 1) {
					vb.sessionIO.drawCard(piece.id);
				} else {
					vb.sessionIO.flipCard(piece.id);
				}
			}

			if(piece.isDie) {
				vb.sessionIO.rollDice(piece.id);
			}

			if(piece.isTimer && piece.isRunning){

				vb.sessionIO.stopTimer(piece.id);
			}

			if(piece.isTimer && !piece.isRunning){
				vb.sessionIO.startTimer(piece.id);
			}
		}
	};
})(VBoard);
