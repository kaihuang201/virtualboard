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
		vboard.loadDummyBlock();
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
			scene.clearColor = new BABYLON.Color3(1, 1, 0.984);
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
			vboard.light = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
			vboard.light.groundColor = new BABYLON.Color3(1, 1, 0.984);

			return scene;
		})();
		vboard.engine.runRenderLoop(vboard.renderLoop);
	};

	vboard.loadDummyBlock = function () {
		vboard.box = BABYLON.Mesh.CreateBox("mesh", 3, vboard.scene);
		var material = new BABYLON.StandardMaterial("std", vboard.scene);
		material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
		material.diffuseTexture = new BABYLON.Texture("b1.png", vboard.scene);
		vboard.box.material = material;
	};

	vboard.renderLoop = function () {
		console.log("renderloop");
		//console.debug(vboard);
		if(vboard.box) {
			vboard.box.position.y = 3*Math.sin(vboard.frame / 50);
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
