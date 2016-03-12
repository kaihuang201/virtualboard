var VBoard = VBoard || {};
(function (vb) {
    //size of the vertical view plane
    vb.size = 10;
    vb.viewSize = 50;

    vb.pieceCounter = 0;

    vb.selectedPiece;

    vb.scribbles = [];
    var i = 0;
    var lines;
    var enableScribble = false;

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

        $("#canvas").click(function(){
            $("#context-menu").css("visibility", "hidden");
        });

        window.addEventListener("mouseup", function(evt){
            if(vb.selectedPiece){
                vb.board.removeSelectedPiece();
            }
        });

        window.addEventListener("mousemove", function(evt){
            if(vb.selectedPiece){
                var newPos = vb.board.screenToGameSpace(new BABYLON.Vector2(vb.scene.pointerX, vb.scene.pointerY));
                vb.board.movePiece(newPos);
            }
        });

        vb.renderInit();

        if(!vb.testing) {
            vb.loadDummyBlocks();
        }
    };

    vb.board = {
        //members
        pieces: [], //ordered list

        //methods

        //adds a new piece to the front of the board
        //should only be called by the generateNewPiece() method
        add: function (piece) {
            this.pieces.push(piece);
            var pieceZ = this.getZIndex(this.pieces.length - 0.5);
            piece.mesh.position.z = pieceZ;
            outlineZ = this.getZIndex(this.pieces.length - 1);
            piece.outlineMesh.position.z = outlineZ;
        },

        ourIndexOf: function(piece){
            for(var i = 0; i < this.pieces.length; i++){
                if(this.pieces[i].id == piece.id){
                    return i;
                }
            }
            return -1;
        },

        //function to calculate z index given a position in the pieces array
        getZIndex: function (index) {
            return 1 + (10/(0.2*index + 1));
        },

        //removes a piece from the board
        remove: function (piece) {
            var index = this.ourIndexOf(piece);
            if(index == -1) return;
            for(var i = index; i < this.pieces.length-1; i++) {
                this.pieces[i] = this.pieces[i+1];
                this.pieces[i].mesh.position.z = this.getZIndex(i);
            }
            this.pieces.pop();
            piece.mesh.dispose();
            piece.outlineMesh.dispose();
        },

        //moves a piece to the back of the board (highest z index)
        pushToBack: function (piece) {
            var index = this.ourIndexOf(piece);
            if(index == -1) return;
            for(var i = index; i > 0; i--) {
                this.pieces[i] = this.pieces[i-1];
                this.pieces[i].mesh.position.z = this.getZIndex(i + 0.5);
                this.pieces[i].outlineMesh.position.z = this.getZIndex(i);
            }
            this.pieces[0] = piece;
            piece.mesh.position.z = this.getZIndex(0.5);
            piece.outlineMesh.position.z = this.getZIndex(0);
        },

        //moves a piece to the front of the board (lowest z index)
        bringToFront: function (piece) {
            var index = this.ourIndexOf(piece);
            if(index == -1) return;
            for(var i = index; i < this.pieces.length-1; i++) {
                this.pieces[i] = this.pieces[i+1];
                this.pieces[i].mesh.position.z = this.getZIndex(i + 0.5);
                this.pieces[i].outlineMesh.position.z = this.getZIndex(i);
            }
            this.pieces[this.pieces.length-1] = piece;
            piece.mesh.position.z = this.getZIndex(this.pieces.length-0.5);
            piece.outlineMesh.position.z = this.getZIndex(this.pieces.length - 1);
        },

        //toggles whether a piece should be static or not
        toggleStatic: function(piece){
            piece.static = !piece.static;
            if(piece.static){
                this.pushToBack(piece);
            }
        },

        generateNewPiece: function (name, user, pos) {
            //to do: create a proper piece "class" with a constructor and methods
            var piece = new Piece(name, user, pos);

            this.add(piece);
        },

        generateNewCard: function (name, user, pos) {
            //to do: create a proper piece "class" with a constructor and methods
            var card = new Card(name, user, pos);

            this.add(card);
        },

        generateNewDie: function (name, user, pos, max) {
            //to do: create a proper piece "class" with a constructor and methods
            var die = new Die(name, user, pos, max);

            this.add(die);
        },

        removeSelectedPiece: function(){
            vb.selectedPiece.pickedUp = false;
            vb.selectedPiece.user = vb.users.getNone();
            vb.selectedPiece.outlineMesh.material.alpha = 0;
            vb.selectedPiece = null;
        },

        setSelectedPiece: function(piece){
            vb.selectedPiece = piece;
            piece.outlineMesh.material.alpha = 0.3;
            piece.pickedUp = true;
            piece.user = vb.users.getLocal();
        },

        createContextMenu: function(piece){
            //make the context menu appear at your mouse position
            $("#context-menu").offset({top: vb.scene.pointerY, left: vb.scene.pointerX-5});
            $("#context-menu").css("visibility", "visible");

            //clear previous onclick function bindings
            $("#context-delete").off("click");
            $("#context-back").off("click");
            $("#context-front").off("click");
            $("#context-static").off("click");
            $("#context-flip").off("click");

            //only show flip option if piece can flip (i.e. is a card)
            if (piece instanceof Card) {
                $("#context-flip").show();
            }
            else {
                $("#context-flip").hide();
            }

            //set new onclick function bindings
            $("#context-delete").on("click", function(){
                vb.board.remove(piece);
                $("#context-menu").css("visibility", "hidden");
            });
            $("#context-back").on("click", function(){
                vb.board.pushToBack(piece);
                $("#context-menu").css("visibility", "hidden");
            });
            $("#context-front").on("click", function(){
                vb.board.bringToFront(piece);
                $("#context-menu").css("visibility", "hidden");
            });
            $("#context-static").on("click" , function(){
                vb.board.toggleStatic(piece);
                $("#context-menu").css("visibility", "hidden");
            });
            $("#context-flip").on("click" , function(){

                if (piece instanceof Card) {
                    piece.flip();
                }
                $("#context-menu").css("visibility", "hidden");
            });
        },

        movePiece: function (newPos) {
            if(!vb.selectedPiece.static){
                vb.selectedPiece.position = new BABYLON.Vector3(newPos.x, newPos.y, vb.selectedPiece.position.z);
                if (newPos.x < vb.viewSize && newPos.x > -vb.viewSize && newPos.y < vb.viewSize && newPos.y > -vb.viewSize) {
                    vb.selectedPiece.mesh.position.x = newPos.x;
                    vb.selectedPiece.mesh.position.y = newPos.y;
                    vb.selectedPiece.outlineMesh.position.x = newPos.x;
                    vb.selectedPiece.outlineMesh.position.y = newPos.y;
                } else if ((newPos.x > vb.viewSize || newPos.x < -vb.viewSize) && (newPos.y < vb.viewSize && newPos.y > -vb.viewSize)) {
                    vb.selectedPiece.mesh.position.y = newPos.y;
                    vb.selectedPiece.outlineMesh.position.y = newPos.y;
                } else if ((newPos.y > vb.viewSize || newPos.y < -vb.viewSize) && (newPos.x < vb.viewSize && newPos.x > -vb.viewSize)) {
                    vb.selectedPiece.mesh.position.x = newPos.x;
                    vb.selectedPiece.outlineMesh.position.x = newPos.x;
                }
                vb.selectedPiece.position.x = vb.selectedPiece.mesh.position.x;
                vb.selectedPiece.position.y = vb.selectedPiece.mesh.position.y;

                if(vb.enableScribble && vb.selectedPiece.name == "penTool") {
                    lines = BABYLON.Mesh.CreateLines("lines", vb.scribbles, vb.scene);
                    vb.scribbles[i] = new BABYLON.Vector3(vb.selectedPiece.mesh.position.x, vb.selectedPiece.mesh.position.y, vb.selectedPiece.mesh.position.z);
                    i++;
                }
            }
        },

        clearBoard: function () {
            while(this.pieces.length > 0) {
                this.remove(this.pieces[this.pieces.length-1]);
            }
        },

        getCenter: function () {
            return new BABYLON.Vector2(0, 0);
        },

        screenToGameSpace: function (position) {
            //screen space
            //also equals to the camera coordinates
            var halfWidth = vb.canvas.getBoundingClientRect().width / 2;
            var halfHeight = vb.canvas.getBoundingClientRect().height / 2;

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
        },

        loadChessGame: function() {
            //var chessMap = {
            //  "Rook": 7,
            //  "Knight": 5,
            //  "Bishop": 3,
            //  ///meh
            //board
            this.generateNewPiece("chessBoard", null, {x:0, y:0});

            //rooks
            this.generateNewPiece("chessRookBlack", null, {x: 7, y: 7});
            this.generateNewPiece("chessRookBlack", null, {x:-7, y: 7});
            this.generateNewPiece("chessRookWhite", null, {x: 7, y:-7});
            this.generateNewPiece("chessRookWhite", null, {x:-7, y:-7});

            //knights
            this.generateNewPiece("chessKnightBlack", null, {x: 5, y: 7});
            this.generateNewPiece("chessKnightBlack", null, {x:-5, y: 7});
            this.generateNewPiece("chessKnightWhite", null, {x: 5, y:-7});
            this.generateNewPiece("chessKnightWhite", null, {x:-5, y:-7});

            //bishops
            this.generateNewPiece("chessBishopBlack", null, {x: 3, y: 7});
            this.generateNewPiece("chessBishopBlack", null, {x:-3, y: 7});
            this.generateNewPiece("chessBishopWhite", null, {x: 3, y:-7});
            this.generateNewPiece("chessBishopWhite", null, {x:-3, y:-7});

            //queens
            this.generateNewPiece("chessQueenBlack", null, {x: 1, y: 7});
            this.generateNewPiece("chessQueenWhite", null, {x:-1, y:-7});

            //kings
            this.generateNewPiece("chessKingBlack", null, {x:-1, y: 7});
            this.generateNewPiece("chessKingWhite", null, {x: 1, y:-7});

            //pawns
            for(var x = -7; x < 8; x += 2) {
                this.generateNewPiece("chessPawnBlack", null, {x: x, y: 5});
                this.generateNewPiece("chessPawnWhite", null, {x: x, y:-5});
            }
        }
    };

    vb.users = {
        //members
        local: null,
        host: null,
        userList: [],   //unordered list
                        //we may want to consider replacing this with an object that maps names to User objects

        //constructor for internal object
        User: function (name, color) {
            //the downside to this construction is that accessing vb.user's methods is not as clean
            this.name = name;
            this.color = color;
            this.ping = -1;
        },

        //methods
        add: function (user) {
            this.userList.push(user);
        },

        remove: function (user) {
            var index = this.userList.indexOf(user);

            this.userList[index] = this.userList[this.userList.length-1];
            this.userList.pop();
        },

        setLocal: function (user) {
            this.local = user;
        },

        getLocal: function () {
            return this.local;
        },

        getNone: function () {
            return null;
        },

        getHost: function () {
            return this.host;
        },

        createNewUser: function (name, color) {
            var user = new this.User(name, color);
            this.add(user);

            if(!this.getLocal()) {
                this.setLocal(user);
            }
        }
    };

    vb.inputs = {
        //to do: separate system from polling buttons (wasd, etc) versus event buttons (backspace, space, etc)
        keysPressed: [],

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
            var oldCameraPos = vb.camera.position;
            var dx = mousePos.x - oldCameraPos.x;
            var dy = mousePos.y - oldCameraPos.y;

            vb.inputs.setZoom(mousePos, delta, dx, dy);

            vb.setCameraPerspective();
        },

        setZoom: function(mousePos, delta, dx, dy){
            if (vb.size < 55 && vb.size > 5) {
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
            } else if (vb.size < 5 && delta < 0) { // should be able to zoom out
                vb.size /= 0.9;
                dx /= 0.9;
                dy /= 0.9;
                vb.camera.position.x = mousePos.x - dx;
                vb.camera.position.y = mousePos.y - dy;
            } else if (vb.size > 55 && delta > 0) { // should be able to zoom in 
                vb.size *= 0.9;
                dx *= 0.9;
                dy *= 0.9;
                vb.camera.position.x = mousePos.x - dx;
                vb.camera.position.y = mousePos.y - dy;
            }
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
                    case 80: //p
                        //Toggles whether moving the pen tool object creates scribbles
                        if(vb.enableScribble == false) {
                            vb.enableScribble = true;
                        } else vb.enableScribble = false;
                        break;
                }
            }
        },
    };

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

            var ground = BABYLON.Mesh.CreateGround("ground1", 10, 10, 2, scene);
            var groundMaterial = new BABYLON.StandardMaterial("ground", scene);
            groundMaterial.specularColor = BABYLON.Color3.Black();
            ground.material = groundMaterial;

            scene.activeCamera = camera;
            camera.detachControl(canvas);
            vb.light = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
            vb.light.groundColor = new BABYLON.Color3(1, 1, 1);
            vb.light.specular = new BABYLON.Color3(0, 0, 0);

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

function Piece(name, user, pos, icon="crown.png", size=3.0) {
    var scene = VBoard.scene;
    var material = new BABYLON.StandardMaterial("std", scene);
    var me = this;

    if(PieceMap.pieces.hasOwnProperty(name)) {
        icon = PieceMap.pieces[name].icon;
        size = PieceMap.pieces[name].size;
    }
    material.diffuseTexture = new BABYLON.Texture(icon, scene);
    material.diffuseTexture.hasAlpha = true;

    var plane = BABYLON.Mesh.CreatePlane("plane1", size, scene);
    plane.material = material;
    plane.position = new BABYLON.Vector3(pos.x, pos.y, 0);

    var outlineMesh = BABYLON.Mesh.CreatePlane("plane2", size*1.1, scene);
    var outlineMaterial = new BABYLON.StandardMaterial("texture", scene);
    outlineMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); //update to get color from user
    outlineMaterial.alpha = 0;
    outlineMesh.material = outlineMaterial;
    outlineMesh.position = new BABYLON.Vector3(pos.x, pos.y, 0);

    me.id = VBoard.pieceCounter++;
    me.name = name;
    me.user = user;
    me.position = pos;
    me.pickedUp = !!user; // This is pretty wacky, but nice and concise
    me.mesh = plane;
    me.outlineMesh = outlineMesh;
    me.icon = icon;
    me.static = false;

    plane.actionManager = new BABYLON.ActionManager(scene);
    plane.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnLeftPickTrigger,
    function (evt) {
        //check that the shift key was pressed for the context menu
        if(VBoard.inputs.keysPressed.indexOf(16) >= 0){
            VBoard.board.createContextMenu(me);
        }
        else if(me.static == false){
            VBoard.board.setSelectedPiece(me);
        }
    }));
}

function Die(name, user, pos, max, size=2.0) {
    this.base = Piece;
    this.base(name, user, pos);

    this.max = max;
    this.value = 1;

    var scene = VBoard.scene;
    var diffuseTexture;
    if (DieMap.dice.hasOwnProperty(name)) {
        this.icons = [];
        for (key in DieMap.dice[name]) {
            if (key != "size") {
                this.icons[key] = DieMap.dice[name][key];
            }
        }

        diffuseTexture = new BABYLON.Texture(this.icons[this.value], scene);
        diffuseTexture.hasAlpha = true;
    }
    else {
        diffuseTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
        diffuseTexture.hasAlpha = true;
        diffuseTexture.drawText(1, 5, 40, "bold 36px Arial", "black" , "white", true);
    }

    this.mesh.material.diffuseTexture = diffuseTexture;

    this.roll = function() {
        this.value = Math.floor(Math.random() * (this.max)) + 1;

        if (this.icons) {
            diffuseTexture = new BABYLON.Texture(this.icons[this.value], scene);
            diffuseTexture.hasAlpha = true;
        }
        else {
            diffuseTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
            diffuseTexture.hasAlpha = true;
            diffuseTexture.drawText(this.value, 5, 40, "bold 36px Arial", "black" , "white", true);
        }

        this.mesh.material.diffuseTexture = diffuseTexture;
    }
}

function Card(name, user, pos, icon="cardback.png", size=4.0, fronticon="cardfront.png") {
    if(CardMap.cards.hasOwnProperty(name)) {
        icon = CardMap.cards[name].icon;
        size = CardMap.cards[name].size;
    }

    this.base = Piece;
    this.base(name, user, pos, icon, size);


    this.facedown = true;

    this.flip = function() {
        this.facedown = !this.facedown;

        var scene = VBoard.scene;
        var material = new BABYLON.StandardMaterial("std", scene);

        if (this.facedown) {
            material.diffuseTexture = new BABYLON.Texture(icon, scene);
        }
        else {
            material.diffuseTexture = new BABYLON.Texture(fronticon, scene);
        }

        material.diffuseTexture.hasAlpha = true;

        this.mesh.material = material;
    }
}

$(document).ready(function () {
    console.log("document ready");
    VBoard.javascriptInit();
});
