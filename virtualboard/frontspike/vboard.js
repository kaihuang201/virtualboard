var vboard = vboard || {};
(function () {
	vboard.javascriptInit = function () {
		console.log("javascriptinit");
		window.addEventListener("resize", vboard.resizeFunc);
		window.addEventListener("keydown", function (evt) {
			switch(evt.keyCode) {
				case 87: //w
				case 38: //up
					vboard.verticalMoveLoop(1);
					break;
				case 83: //s
				case 40: //down
					vboard.verticalMoveLoop(-1);
					break;
				case 68: //d
				case 39: //right
					vboard.horizontalMoveLoop(1);
					break;
				case 65: //a
				case 37: //left
					vboard.horizontalMoveLoop(-1);
					break;
			}
		});
		window.addEventListener("keyup", function (evt) {
			switch(evt.keyCode) {
				case 87: //w
				case 38: //up
					vboard.verticalMoveLoop(0);
					break;
				case 83: //s
				case 40: //down
					vboard.verticalMoveLoop(0);
					break;
				case 68: //d
				case 39: //right
					vboard.horizontalMoveLoop(0);
					break;
				case 65: //a
				case 37: //left
					vboard.horizontalMoveLoop(0);
					break;
			}
		});
		vboard.renderInit();
		vboard.loadDummyBlocks();
		var canvas = vboard.engine.getRenderingCanvas();
		//canvas.addEventListener("mousedown", function (evt) {
		//	//if(evt.button !== 0) {
		//	//	return;
		//	// }
		//	console.log("pointer down");
        //
		//	var pickInfo = vboard.scene.pick(vboard.scene.pointerX, vboard.scene.pointerY, function (mesh) {
		//		return true;
		//	}, false);
        //
		//	if(pickInfo.hit) {
		//		vboard.currentMesh = pickInfo.pickedMesh;
		//		vboard.lastMeshPos = [vboard.scene.pointerX, vboard.scene.pointerY];
		//	}
		//});
		canvas.addEventListener("mousedown", vboard.onPointerDown);
		canvas.addEventListener("mouseup", vboard.onPointerUp);
		canvas.addEventListener("mousemove", vboard.onPointerMove);
	};

	vboard.verticalMoveLoop = function (dir) {
		window.clearTimeout(vboard.verticalMoveTick);

		if(dir != 0) {
			vboard.camera.position.y += dir*0.05;
			vboard.verticalMoveTick = setTimeout(function () {
				vboard.verticalMoveLoop(dir);
			}, 16);
		}
	};

	vboard.horizontalMoveLoop = function (dir) {
		window.clearTimeout(vboard.horizontalMoveTick);

		if(dir != 0) {
			vboard.camera.position.x += dir*0.05;
			vboard.horizontalMoveTick = setTimeout(function () {
				vboard.horizontalMoveLoop(dir);
			}, 16);
		}
	};

	vboard.renderInit = function () {
		console.log("renderinit");
		vboard.frame = 0;
		vboard.canvas = document.getElementById("canvas");
		var canvas = vboard.canvas;
		vboard.engine = new BABYLON.Engine(canvas, true);
		vboard.scene = (function () {
			var scene = new BABYLON.Scene(vboard.engine);
			scene.clearColor = new BABYLON.Color3(0.5, 1, 0.984);
			var camera = new BABYLON.FreeCamera("Camera", new BABYLON.Vector3(0, 10, 0), scene);
			vboard.camera = camera;

			camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
			vboard.setCameraPerspective();
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
			camera.inertia = 0.6;
			camera.angularSensibility = Infinity;
			camera.maxCameraSpeed = 80;
			camera.cameraAcceleration = 0.1;
			//camera.rotation = new BABYLON.Vector3(Math.PI/2, 0, 0);

			scene.activeCamera = camera;
			camera.detachControl(canvas);
			vboard.light = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
			vboard.light.groundColor = new BABYLON.Color3(1, 1, 0.984);

			//scene.onDispose = function () {
			//	window.removeEventListener("pointerdown", vboard.onPointerDown);
			//	window.removeEventListener("pointerup", vboard.onPointerUp);
			//	window.removeEventListener("pointermove", vboard.onPointerMove);
			// };

			return scene;
		})();
		vboard.engine.runRenderLoop(vboard.renderLoop);
	};

	vboard.onPointerDown = function (evt) {
		//if(evt.button !== 0) {
		//	return;
		// }
		console.log("pointer down");

		var pickInfo = vboard.scene.pick(vboard.scene.pointerX, vboard.scene.pointerY, function (mesh) {
			return true;
		});

		if(pickInfo.hit) {
			vboard.currentMesh = pickInfo.pickedMesh;
			vboard.lastMeshPos = [vboard.scene.pointerX, vboard.scene.pointerY];
		}
	};

	vboard.onPointerUp = function (evt) {
		//if(evt.button !== 0) {
		//	return;
		// }
		console.log("pointer up");
		vboard.currentMesh = null;
	};

	vboard.onPointerMove = function (evt) {
		if(!vboard.currentMesh) {
			return;
		}
		console.log("pointer move");
		var currPos = [vboard.scene.pointerX, vboard.scene.pointerY];
		var diffx = currPos[0] - vboard.lastMeshPos[0];
		var diffy = currPos[1] - vboard.lastMeshPos[1];
		vboard.currentMesh.position = vboard.currentMesh.position.add(new BABYLON.Vector3(diffx, -diffy, 0));
		vboard.lastMeshPos = currPos;
	};

	vboard.loadDummyBlocks = function () {
		var material1 = new BABYLON.StandardMaterial("std", vboard.scene);
		material1.diffuseColor = new BABYLON.Color3(1, 1, 1);
		material1.diffuseTexture = new BABYLON.Texture("b1.png", vboard.scene);

		var material2 = new BABYLON.StandardMaterial("std", vboard.scene);
		//material2.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
		material2.diffuseTexture = new BABYLON.Texture("SPACE_1.jpg", vboard.scene);

		var material3 = new BABYLON.StandardMaterial("std", vboard.scene);
		material3.diffuseTexture = new BABYLON.Texture("crown.png", vboard.scene);
		material3.diffuseTexture.hasAlpha = true;
		//material3.diffuseTexture.useAlphaFromDiffuseTexture = true;

		var plane1 = BABYLON.Mesh.CreatePlane("plane", 3.0, vboard.scene);
		plane1.material = material1;
		plane1.position = new BABYLON.Vector3(0, 10, 1);

		var plane2 = BABYLON.Mesh.CreatePlane("plane", 2.0, vboard.scene);
		plane2.material = material3;
		plane2.position = new BABYLON.Vector3(0, 3, 1.5);

		var plane3 = BABYLON.Mesh.CreatePlane("plane", 4.0, vboard.scene);
		plane3.material = material2;
		plane3.position = new BABYLON.Vector3(6, 4, 2);
	};

	vboard.renderLoop = function () {
		console.log("renderloop");
		//console.debug(vboard);
		if(vboard.box) {
			//vboard.box.position.y = 3*Math.sin(vboard.frame / 50);
		}
		vboard.frame++;
		vboard.scene.render();
	};

	vboard.setCameraPerspective = function () {
		var ratio = window.innerWidth / window.innerHeight;
		var size = 10;
		vboard.camera.orthoTop = size;
		vboard.camera.orthoBottom = -size;
		vboard.camera.orthoRight = ratio*size;
		vboard.camera.orthoLeft = -ratio*size;
	};

	vboard.resizeFunc = function () {
		vboard.setCameraPerspective();
		//vboard.engine.resize();
	};
})();
$(document).ready(function () {
	console.log("document ready");
	vboard.javascriptInit();
});
