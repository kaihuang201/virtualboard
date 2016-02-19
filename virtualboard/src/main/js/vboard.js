var VBoard = VBoard || {};
(function (vb) {



    vb.board = (function() {

        var board = {};
        board.pieces = [];

        board.add = function(piece){
            board.pieces.push(piece);
            var z = board.getZIndex(board.pieces.length);
            piece.mesh.position.z = z;
        };

        board.getZIndex = function(index){
            return 1 + (10/(0.2*index + 1));
        };

        board.remove = function(piece){
            var index = board.pieces.indexOf(piece);
            for(var i = index; i < board.pieces.length-1; i++){
                board.pieces[i] = board.pieces[i+1];
                board.pieces[i].mesh.position.z = board.getZIndex(i);
            }
            board.pieces.pop();
            piece.mesh.dispose();
        };

        board.pushToBack = function(piece){
            var index = board.pieces.indexOf(piece);
            for(var i = index-1; i < 0; i--){
                board.pieces[i] = board.pieces[i-1];
                board.pieces[i].mesh.position.z = board.getZIndex(i);
            }
            board.pieces[0] = piece;
            piece.mesh.position.z = board.getZIndex(0);
        };

        board.bringToFront = function(piece){
            var index = board.pieces.indexOf(piece);
            for(var i = index; i < board.pieces.length-1; i++){
                board.pieces[i] = board.pieces[i+1];
                board.pieces[i].mesh.position.z = board.getZIndex(i);
            }
            board.pieces[board.pieces.length-1] = piece;
            piece.mesh.position.z = board.getZIndex(board.pieces.length-1);
        };

        board.generatePiece = function(name, user, pos){

            var material = new BABYLON.StandardMaterial("std", VBoard.scene);
            material.diffuseTexture = new BABYLON.Texture("/../../../res/crown.png", VBoard.scene);
            material.diffuseTexture.hasAlpha = true;

            var plane = BABYLON.Mesh.CreatePlane("plane", 3.0, VBoard.scene);
            plane.material = material;
            plane.position = new BABYLON.Vector3(pos.x, pos.y, 0);

            var piece = {};
            piece.name = name;
            piece.user = user;
            piece.position = pos;
            piece.pickedUp = !!user;
            piece.mesh = plane;
            piece.icon = "/../../../res/crown.png";

            board.add(piece);

        };

        board.movePiece = function(piece, pos, user, instant){

        };

        board.clearBoard = function(){
            while(board.pieces.length > 0){
                board.remove(board.pieces[board.pieces.length-1]);
            }
        };

        return board;

    })();


    vb.users = (function(){

        var users = {};
        users.local = null;
        users.host = null;
        users.userList = [];

        users.add = function(user){
            users.userList.push(user);
        };

        users.remove = function(user){
            var index = users.userList.indexOf(user);

            users.userList[index] = users.userList[users.userList.length-1];
            users.userList.pop();


        };

        users.setLocal = function(user){
            users.local = user;
        };

        users.getLocal = function(){
            return users.local;
        };

        users.getNone = function(){
            return null;
        };

        users.getHost = function(){
            return users.host;
        };

        users.createNewUser = function(name, color){
            var user = {};
            user.name = name;
            user.color = color;
            user.ping = -1;
            users.add(user);

            if(!users.getLocal()){
                users.setLocal(user);
            }

        };

        return users;

    })();













    VBoard.javascriptInit = function () {
        console.log("javascriptinit");
        window.addEventListener("resize", VBoard.resizeFunc);
        window.addEventListener("keydown", function (evt) {
            switch(evt.keyCode) {
                case 87: //w
                case 38: //up
                    VBoard.verticalMoveLoop(1);
                    break;
                case 83: //s
                case 40: //down
                    VBoard.verticalMoveLoop(-1);
                    break;
                case 68: //d
                case 39: //right
                    VBoard.horizontalMoveLoop(1);
                    break;
                case 65: //a
                case 37: //left
                    VBoard.horizontalMoveLoop(-1);
                    break;
            }
        });
        window.addEventListener("keyup", function (evt) {
            switch(evt.keyCode) {
                case 87: //w
                case 38: //up
                    VBoard.verticalMoveLoop(0);
                    break;
                case 83: //s
                case 40: //down
                    VBoard.verticalMoveLoop(0);
                    break;
                case 68: //d
                case 39: //right
                    VBoard.horizontalMoveLoop(0);
                    break;
                case 65: //a
                case 37: //left
                    VBoard.horizontalMoveLoop(0);
                    break;
            }
        });
        VBoard.renderInit();
        VBoard.loadDummyBlocks();
        var canvas = VBoard.engine.getRenderingCanvas();
        //canvas.addEventListener("mousedown", function (evt) {
        //  //if(evt.button !== 0) {
        //  //  return;
        //  // }
        //  console.log("pointer down");
        //
        //  var pickInfo = VBoard.scene.pick(VBoard.scene.pointerX, VBoard.scene.pointerY, function (mesh) {
        //      return true;
        //  }, false);
        //
        //  if(pickInfo.hit) {
        //      VBoard.currentMesh = pickInfo.pickedMesh;
        //      VBoard.lastMeshPos = [VBoard.scene.pointerX, VBoard.scene.pointerY];
        //  }
        //});
        canvas.addEventListener("mousedown", VBoard.onPointerDown);
        canvas.addEventListener("mouseup", VBoard.onPointerUp);
        canvas.addEventListener("mousemove", VBoard.onPointerMove);
    };

    VBoard.verticalMoveLoop = function (dir) {
        window.clearTimeout(VBoard.verticalMoveTick);

        if(dir != 0) {
            VBoard.camera.position.y += dir*0.05;
            VBoard.verticalMoveTick = setTimeout(function () {
                VBoard.verticalMoveLoop(dir);
            }, 16);
        }
    };

    VBoard.horizontalMoveLoop = function (dir) {
        window.clearTimeout(VBoard.horizontalMoveTick);

        if(dir != 0) {
            VBoard.camera.position.x += dir*0.05;
            VBoard.horizontalMoveTick = setTimeout(function () {
                VBoard.horizontalMoveLoop(dir);
            }, 16);
        }
    };

    VBoard.renderInit = function () {
        console.log("renderinit");
        VBoard.frame = 0;
        VBoard.canvas = document.getElementById("canvas");
        var canvas = VBoard.canvas;
        VBoard.engine = new BABYLON.Engine(canvas, true);
        VBoard.scene = (function () {
            var scene = new BABYLON.Scene(VBoard.engine);
            scene.clearColor = new BABYLON.Color3(0.5, 1, 0.984);
            var camera = new BABYLON.FreeCamera("Camera", new BABYLON.Vector3(0, 10, 0), scene);
            VBoard.camera = camera;

            camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
            VBoard.setCameraPerspective();
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
            VBoard.light = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
            VBoard.light.groundColor = new BABYLON.Color3(1, 1, 0.984);

            //scene.onDispose = function () {
            //  window.removeEventListener("pointerdown", VBoard.onPointerDown);
            //  window.removeEventListener("pointerup", VBoard.onPointerUp);
            //  window.removeEventListener("pointermove", VBoard.onPointerMove);
            // };

            return scene;
        })();
        VBoard.engine.runRenderLoop(VBoard.renderLoop);
    };

    VBoard.onPointerDown = function (evt) {
        //if(evt.button !== 0) {
        //  return;
        // }
        console.log("pointer down");

        var pickInfo = VBoard.scene.pick(VBoard.scene.pointerX, VBoard.scene.pointerY, function (mesh) {
            return true;
        });

        if(pickInfo.hit) {
            VBoard.currentMesh = pickInfo.pickedMesh;
            VBoard.lastMeshPos = [VBoard.scene.pointerX, VBoard.scene.pointerY];
        }
    };

    VBoard.onPointerUp = function (evt) {
        //if(evt.button !== 0) {
        //  return;
        // }
        console.log("pointer up");
        VBoard.currentMesh = null;
    };

    VBoard.onPointerMove = function (evt) {
        if(!VBoard.currentMesh) {
            return;
        }
        console.log("pointer move");
        var currPos = [VBoard.scene.pointerX, VBoard.scene.pointerY];
        var diffx = currPos[0] - VBoard.lastMeshPos[0];
        var diffy = currPos[1] - VBoard.lastMeshPos[1];
        VBoard.currentMesh.position = VBoard.currentMesh.position.add(new BABYLON.Vector3(diffx, -diffy, 0));
        VBoard.lastMeshPos = currPos;
    };

    VBoard.loadDummyBlocks = function () {
        var material1 = new BABYLON.StandardMaterial("std", VBoard.scene);
        material1.diffuseColor = new BABYLON.Color3(1, 1, 1);
        material1.diffuseTexture = new BABYLON.Texture("b1.png", VBoard.scene);

        var material2 = new BABYLON.StandardMaterial("std", VBoard.scene);
        //material2.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        material2.diffuseTexture = new BABYLON.Texture("SPACE_1.jpg", VBoard.scene);

        var material3 = new BABYLON.StandardMaterial("std", VBoard.scene);
        material3.diffuseTexture = new BABYLON.Texture("crown.png", VBoard.scene);
        material3.diffuseTexture.hasAlpha = true;
        //material3.diffuseTexture.useAlphaFromDiffuseTexture = true;

        var plane1 = BABYLON.Mesh.CreatePlane("plane", 3.0, VBoard.scene);
        plane1.material = material1;
        plane1.position = new BABYLON.Vector3(0, 10, 1);

        var plane2 = BABYLON.Mesh.CreatePlane("plane", 2.0, VBoard.scene);
        plane2.material = material3;
        plane2.position = new BABYLON.Vector3(0, 3, 1.5);

        var plane3 = BABYLON.Mesh.CreatePlane("plane", 4.0, VBoard.scene);
        plane3.material = material2;
        plane3.position = new BABYLON.Vector3(6, 4, 2);
    };

    VBoard.renderLoop = function () {
        console.log("renderloop");
        //console.debug(VBoard);
        if(VBoard.box) {
            //VBoard.box.position.y = 3*Math.sin(VBoard.frame / 50);
        }
        VBoard.frame++;
        VBoard.scene.render();
    };

    VBoard.setCameraPerspective = function () {
        var ratio = window.innerWidth / window.innerHeight;
        var size = 10;
        VBoard.camera.orthoTop = size;
        VBoard.camera.orthoBottom = -size;
        VBoard.camera.orthoRight = ratio*size;
        VBoard.camera.orthoLeft = -ratio*size;
    };

    VBoard.resizeFunc = function () {
        VBoard.setCameraPerspective();
        //VBoard.engine.resize();
    };
})();
$(document).ready(function () {
    console.log("document ready");
    VBoard.javascriptInit();
});
