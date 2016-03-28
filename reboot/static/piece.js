var VBoard = VBoard || {};
(function (vb) {
    vb.doubleClickTime = 200;

    vb.Piece = function(pieceData) {
        var me = this;
        this.size = pieceData["s"];
        var c = pieceData["color"];
        this.color = new BABYLON.Color3(c[0]/255, c[1]/255, c[2]/255);

        var plane = BABYLON.Mesh.CreatePlane("plane", this.size, vb.scene);
        var material = new BABYLON.StandardMaterial("std", vb.scene);
        plane.position = new BABYLON.Vector3(pieceData["pos"][0], pieceData["pos"][1], 0);
        plane.rotation.z = pieceData["r"];
        plane.piece = this;
        plane.material = material;

        //position - last server confirmed position     
        //targetPosition - the same as position except for when the local user is moving the piece      
        //                  specifically, targetPosition is where the piece will end up after transition smoothing      
        //mesh.position - where the piece is being rendered
        this.id = pieceData["piece"];
        this.position = new BABYLON.Vector2(pieceData["pos"][0], pieceData["pos"][1]);
        this.mesh = plane;
        this.static = pieceData["static"] == 1;
        this.highlightTimeout = null;
        this.predictTimeout = null;
        this.isCard = false;
        this.isDie = false;
        this.lastTrigger = null;
        this.doubleClick = null;
        vb.board.setIcon(this, pieceData["icon"]);

        plane.actionManager = new BABYLON.ActionManager(vb.scene);

        //TODO: instead of attaching a code action to each piece
        //      we should just have a scene.pick trigger in a global event listener
        //      We also should be able to right click anywhere to bring up a menu
        //      that lets us add a piece at that location.

        //TODO: do not register if static, make a register/unregister block in transformPiece
        plane.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnLeftPickTrigger, function (evt) {
                console.debug(evt);
                console.log("click on: " + me.id);

                var time = new Date().getTime();
                if (me.lastTrigger && time - me.lastTrigger < vb.doubleClickTime) {
                    if (me.doubleClick) {
                        me.doubleClick();
                    }
                }
                me.lastTrigger = time;

                if(me.static == false) {

                    //check that the shift key was pressed for the context menu
                    if(evt.sourceEvent.shiftKey) {
                        /*if(vb.selection.hasPiece(me)) {
                            console.log("shift+remove");
                            vb.selection.removePiece(piece);
                        } else {
                            console.log("shift+add");
                            vb.selection.addPiece(me);
                        }*/
                        vb.menu.createContextMenu(me);
                    } else {
                        if(vb.selection.hasPiece(me)) {
                            vb.selection.clearAndSetOnMouseUp = me;
                        } else {
                            vb.selection.setPieces([me]);
                        }
                    }
                    evt.sourceEvent.handled = true;
                }
            })
        );

        if(pieceData.hasOwnProperty("user")) {
            var user = vb.users.userList[pieceData["user"]];
            vb.board.highlightPiece(this, user.color, vb.addHighlightDuration);
        }
        return this;
    };

    vb.Card = function(pieceData) {
        this.base = vb.Piece;
        this.base(pieceData);

        this.faceup = pieceData["faceup"];
        if (this.faceup) {
            vb.board.setIcon(this, pieceData["front_icon"]);
        }

        this.flip = function (newIcon) {
            this.faceup = !this.facedown;

            vb.board.setIcon(this, newIcon);
        }

        this.doubleClick = function() {
            vb.sessionIO.flipCard(this.id);
        }

        return this;
    };

    vb.Deck = function(pieceData) {
        this.base = vb.Piece;
        this.base(pieceData);

        this.numCards = pieceData["count"].length;

        var scene = vb.scene;
        this.mesh.material.diffuseTexture = new BABYLON.DynamicTexture("dynamic texture", 512, scene);
        this.mesh.material.diffuseTexture.drawText(this.numCards, null, 50 * this.size, "Bold 128px Arial", "rgba(255,255,255,1.0)", "black");

        this.updateCount = function(newCount) {
            this.numCards = newCount;
            this.mesh.material.diffuseTexture.drawText(this.numCards, null, 50 * this.size, "bold 128px Arial", "rgba(255,255,255,1.0)", "black");
        }

        return this;
    };

    vb.Die = function(pieceData) {
        this.base = vb.Piece;
        this.base(pieceData);

        this.max = pieceData.max_roll;

        this.roll = function(icon) {
            vb.board.setIcon(this, icon);
        }

        this.doubleClick = function() {
            vb.sessionIO.rollDice(this.id);
        }

        return this;
    }
})(VBoard);