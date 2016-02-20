var VBoard = VBoard || {};
(function (vb) {
	//size of the vertical view plane
	vb.size = 10;

	vb.javascriptInit = function () {
		vb.simTime = Date.now();
		window.addEventListener("resize", vb.setCameraPerspective);
		window.addEventListener("keydown", function (evt) {
			vb.inputs.onKeyDown(evt.keyCode);
			if(!evt.metaKey) {
				evt.preventDefault();
			}
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
		vb.renderInit();
		vb.loadDummyBlocks();
	};

	vb.board = (function () {

		var board = {};
		board.pieces = []; //ordered list

		//this should probably be fetched as a separate file
		board.pieceMap = {
			"chessKingBlack" : {
				"size" : 2.0,
				"icon" : "nbking.png"
			},
			"chessQueenBlack" : {
				"size" : 2.0,
				"icon" : "nbqueen.png"
			},
			"chessKnightBlack" : {
				"size" : 2.0,
				"icon" : "nbknight.png"
			},
			"chessBishopBlack" : {
				"size" : 2.0,
				"icon" : "nbbishop.png"
			},
			"chessRookBlack" : {
				"size" : 2.0,
				"icon" : "nbrook.png"
			},
			"chessPawnBlack" : {
				"size" : 2.0,
				"icon" : "nbpawn.png"
			},
			"chessKingWhite" : {
				"size" : 2.0,
				"icon" : "nwking.png"
			},
			"chessQueenWhite" : {
				"size" : 2.0,
				"icon" : "nwqueen.png"
			},
			"chessKnightWhite" : {
				"size" : 2.0,
				"icon" : "nwknight.png"
			},
			"chessBishopWhite" : {
				"size" : 2.0,
				"icon" : "nwbishop.png"
			},
			"chessRookWhite" : {
				"size" : 2.0,
				"icon" : "nwrook.png"
			},
			"chessPawnWhite" : {
				"size" : 2.0,
				"icon" : "nwpawn.png"
			},
			"chessBoard" : {
				"size" : 16.0,
				"icon" : "background.png"
			}
		};

		board.add = function (piece) {
			board.pieces.push(piece);
			var z = board.getZIndex(board.pieces.length-1);
			piece.mesh.position.z = z;
		};

		board.getZIndex = function (index) {
			return 1 + (10/(0.2*index + 1));
		};

		board.remove = function (piece) {
			var index = board.pieces.indexOf(piece);
			for(var i = index; i < board.pieces.length-1; i++) {
				board.pieces[i] = board.pieces[i+1];
				board.pieces[i].mesh.position.z = board.getZIndex(i);
			}
			board.pieces.pop();
			piece.mesh.dispose();
		};

		board.pushToBack = function (piece) {
			var index = board.pieces.indexOf(piece);
			for(var i = index-1; i < 0; i--) {
				board.pieces[i] = board.pieces[i-1];
				board.pieces[i].mesh.position.z = board.getZIndex(i);
			}
			board.pieces[0] = piece;
			piece.mesh.position.z = board.getZIndex(0);
		};

		board.bringToFront = function (piece) {
			var index = board.pieces.indexOf(piece);
			for(var i = index; i < board.pieces.length-1; i++) {
				board.pieces[i] = board.pieces[i+1];
				board.pieces[i].mesh.position.z = board.getZIndex(i);
			}
			board.pieces[board.pieces.length-1] = piece;
			piece.mesh.position.z = board.getZIndex(board.pieces.length-1);
		};

		board.generateNewPiece = function (name, user, pos) {

			var material = new BABYLON.StandardMaterial("std", vb.scene);
			var icon = "crown.png";
			var size = 3.0;

			if(board.pieceMap.hasOwnProperty(name)) {
				icon = board.pieceMap[name].icon;
				size = board.pieceMap[name].size;
			}
			material.diffuseTexture = new BABYLON.Texture(icon, vb.scene);
			material.diffuseTexture.hasAlpha = true;

			var plane = BABYLON.Mesh.CreatePlane("plane", size, vb.scene);
			plane.material = material;
			plane.position = new BABYLON.Vector3(pos.x, pos.y, 0);

			var piece = {};
			piece.name = name;
			piece.user = user;
			piece.position = pos;
			piece.pickedUp = !!user;
			piece.mesh = plane;
			piece.icon = icon;

			board.add(piece);
		};

		board.movePiece = function (piece, pos, user, instant) {
			//to do
		};

		board.clearBoard = function () {
			while(board.pieces.length > 0) {
				board.remove(board.pieces[board.pieces.length-1]);
			}
		};

		board.getCenter = function () {
			return new BABYLON.Vector2(0, 0);
		};

		board.screenToGameSpace = function (position) {
			//screen space
			//also equals to the camera coordinates
			var halfWidth = vb.canvas.width / 2;
			var halfHeight = vb.canvas.height / 2;

			//game space
			var cameraX = vb.camera.position.x;
			var cameraY = vb.camera.position.y;

			//screen space
			var screenDX = (position.x - halfWidth);
			var screenDY = (position.y - halfHeight);

			var ratio = vb.canvas.width / vb.canvas.height;
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
		};
		return board;
	})();

	vb.users = (function () {

		var users = {};
		users.local = null;
		users.host = null;
		users.userList = []; //unordered list

		users.add = function (user) {
			users.userList.push(user);
		};

		users.remove = function (user) {
			var index = users.userList.indexOf(user);

			users.userList[index] = users.userList[users.userList.length-1];
			users.userList.pop();
		};

		users.setLocal = function (user) {
			users.local = user;
		};

		users.getLocal = function () {
			return users.local;
		};

		users.getNone = function () {
			return null;
		};

		users.getHost = function () {
			return users.host;
		};

		users.createNewUser = function (name, color) {
			var user = {};
			user.name = name;
			user.color = color;
			user.ping = -1;
			users.add(user);

			if(!users.getLocal()) {
				users.setLocal(user);
			}
		};
		return users;
	})();

	vb.inputs = (function () {
		var inputs = {};
		inputs.keysPressed = [];

		inputs.onKeyDown = function (key) {
			//console.log("NEW KEY: " + key);
			if(inputs.keysPressed.indexOf(key) == -1) {
				//console.log("sanity check: " + key);
				inputs.keysPressed.push(key);
			}
		};

		inputs.onKeyUp = function (key) {
			var index = inputs.keysPressed.indexOf(key);
			inputs.keysPressed.splice(index, 1);
		};

		inputs.onScroll = function (delta) {
			//console.log(delta);
			//note: there is definitely some way for this to get messed up after the board has been manipulated to some extent
			//it seems to have something to do with opening/closing the developer console

			var mousePos = vb.board.screenToGameSpace({
				x: vb.scene.pointerX,
				y: vb.scene.pointerY
			});
			var oldCameraPos = vb.camera.position;
			var dx = mousePos.x - oldCameraPos.x;
			var dy = mousePos.y - oldCameraPos.y;

			if(delta > 0) {
				vb.size *= 0.9;
				dx *= 0.9;
				dy *= 0.9;
			} else {
				vb.size /= 0.9;
				dx /= 0.9;
				dy /= 0.9;
			}
			vb.camera.position.x = mousePos.x - dx;
			vb.camera.position.y = mousePos.y - dy;

			vb.setCameraPerspective();
		};

		inputs.processInputs = function (elapsed) {
			//console.log("ELAPSED: " + elapsed);
			var inertia = 2000;
			var up = vb.camera.upVector;
			var dist = (elapsed / inertia) * vb.size

			for(var index = 0; index < inputs.keysPressed.length; index++) {
				switch(inputs.keysPressed[index]) {
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
						//warning: breaks camera panning and screenToGameSpace
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
		};
		return inputs;
	})();

	vb.renderInit = function () {
		vb.frame = 0;
		vb.canvas = document.getElementById("canvas");
		var canvas = vb.canvas;
		vb.engine = new BABYLON.Engine(canvas, true);
		vb.scene = (function () {
			var scene = new BABYLON.Scene(vb.engine);
			scene.clearColor = new BABYLON.Color3(0.5, 1, 0.984);
			var camera = new BABYLON.FreeCamera("Camera", new BABYLON.Vector3.Zero(), scene);
			vb.camera = camera;
			camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
			vb.setCameraPerspective();
			camera.setTarget(new BABYLON.Vector3.Zero());

			camera.attachControl(canvas, false);
			//camera.keysUp.push(87); // W
			//camera.keysLeft.push(65); // A
			//camera.keysDown.push(83); // S
			//camera.keysRight.push(68); // D
			camera.keysUp = [];
			camera.keysLeft = [];
			camera.keysDown = [];
			camera.keysRight = [];
			//camera.inertia = 0.6;
			//camera.angularSensibility = Infinity;
			//camera.maxCameraSpeed = 80;
			//camera.cameraAcceleration = 0.1;
			//camera.rotation = new BABYLON.Vector3(Math.PI/2, 0, 0);

			scene.activeCamera = camera;
			camera.detachControl(canvas);
			vb.light = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
			vb.light.groundColor = new BABYLON.Color3(1, 1, 1);

			return scene;
		})();
		vb.engine.runRenderLoop(vb.renderLoop);
	};

	vb.setCameraPerspective = function () {
		var ratio = window.innerWidth / window.innerHeight;
		var size = vb.size;
		vb.camera.orthoTop = size;
		vb.camera.orthoBottom = -size;
		vb.camera.orthoRight = ratio*size;
		vb.camera.orthoLeft = -ratio*size;
	};

	vb.loadDummyBlocks = function () {
		vb.board.generateNewPiece("test piece", vb.users.getLocal(), new BABYLON.Vector2(0, 0));
	};

	vb.renderLoop = function () {
		var time = Date.now();
		var dt = time - vb.simTime;
		vb.simTime = time;
		vb.frame++;
		vb.inputs.processInputs(dt);
		vb.scene.render();
	};
})(VBoard);
$(document).ready(function () {
	console.log("document ready");
	VBoard.javascriptInit();
});
