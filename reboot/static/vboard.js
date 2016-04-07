var VBoard = VBoard || {};
(function (vb) {
	//size of the vertical view plane
	vb.size = 10;

	//max/min/view size should probably be bound to VBoard.board
	vb.maxSize = 55;
	vb.minSize = 3;
	vb.BoardHeight = 50;
	vb.BoardWidth = 50;
	vb.moveHighlightDuration = 500; //milliseconds
	vb.addHighlightDuration = 500; //milliseconds
	vb.predictionTimeout = 500; //delay until we roll back the client sided prediction

	//TODO: congestion control should scale based on number of people in the server, and maybe even based average actions per second
	vb.moveTickDuration = 100; //maximum time to hold onto new positional data before sending it
	vb.smoothTransitionDuration = 90; //how many milliseconds to smooth out motion received from the server

	vb.doubleClickTime = 250;

	vb.testImageURL = "http://i.imgur.com/KUALoHO.jpg";

	//number of static meshes that are not pieces
	vb.staticMeshCount = 0;

	vb.quickStart = function () {
		vb.limboIO.hostGame("bill", [0, 0, 255], "chess deathmatch", "12345");
		vb.quickStarted = true;
	};

	vb.quickJoin = function () {
		//this will only work if the game id of the target game is 0
		//if you have closed and reopened the host game without restarting the tornado server this will not work
		vb.limboIO.joinGame("bob", [0, 255, 0], 0, "12345");
	};

	vb.javascriptInit = function () {
		//networking
		vb.socket = new WebSocket("ws://" + window.location.host + window.location.pathname + "socket");

		vb.socket.onopen = function () {
			//TODO: display some kind of "loading..." animation
			vb.interface.showLoading();

			//fetch game list
			vb.limboIO.listGames();
		};
		vb.socket.onmessage = vb.limboIO.messageHandler;
		vb.socket.onclose = function () {
			console.log("rip socket");

			vb.interface.alertModal('Socket is closed, please refresh page!', 1);
			clearInterval(VBoard.interface.autoGameListIntervalID);

		};
	};

	//this function is called when we enter a game session
	vb.launchCanvas = function () {
		vb.simTime = Date.now();
		vb.inputs.initialize();

		vb.renderInit();

		$("#menu").css("visibility", "visible");

		if(vb.quickStarted) {
			vb.sessionIO.loadChessGame();
		}
	};

	vb.renderInit = function () {
		vb.frame = 0;
		vb.canvas = document.getElementById("canvas");
		var canvas = vb.canvas;
		vb.engine = new BABYLON.Engine(canvas, true);
		vb.scene = (function () {
			var scene = new BABYLON.Scene(vb.engine);
			// scene.clearColor = new BABYLON.Color3(0.5, 1, 0.984);
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
			vb.light.specular = new BABYLON.Color3(0, 0, 0);
			vb.light.intensity = .6;

			vb.board.background = BABYLON.Mesh.CreatePlane("background", 50, scene);
			vb.board.background.position = new BABYLON.Vector3(0, 0, 100);
			vb.board.background.isPickable = false;
			vb.staticMeshCount++;

			vb.board.selectionBox = BABYLON.Mesh.CreatePlane("selection box", 1, scene);
			vb.board.selectionBox.position.z = 100;
			vb.board.selectionBox.subMeshes = [];
			vb.staticMeshCount++;

			scene.onPointerDown = function(evt,pickResult) {
				if (pickResult.hit) {
					console.log("mousedown at (" + (pickResult.pickedPoint.x).toString() +',' +(pickResult.pickedPoint.y).toString() +")");
					vb.inputs.onMouseDown(evt, pickResult);	
				}
			};
				
			scene.onPointerMove = function (evt,pickResult) {
				vb.inputs.onMouseMove(evt, pickResult);
			};
			scene.onPointerUp = function (evt,pickResult) {
				vb.inputs.onMouseUp(evt, pickResult);
			};
			scene.onPointerPick = function (evt,pickResult) {
				// vb.inputs.onMousePick(evt, pickResult);
			};

			return scene;
		})();
		vb.engine.runRenderLoop(vb.renderLoop);
	};

	vb.setCameraPerspective = function () {
		vb.canvas.height = window.innerHeight;
		vb.canvas.width = window.innerWidth;
		var ratio = window.innerWidth / window.innerHeight;
		var size = vb.size;
		vb.camera.orthoTop = size;
		vb.camera.orthoBottom = -size;
		vb.camera.orthoRight = ratio*size;
		vb.camera.orthoLeft = -ratio*size;
	};

	vb.renderLoop = function () {
		var time = Date.now();
		var dt = time - vb.simTime;
		vb.simTime = time;
		vb.frame++;
		vb.inputs.processInputs(dt);
		vb.board.movePieces(dt);
		vb.engine.setDepthWrite(false);
		vb.scene.render();
	};
})(VBoard);

$(document).ready(function () {
	console.log("document ready");
	VBoard.javascriptInit();
	VBoard.interface.init();
	VBoard.menu.init();
});
