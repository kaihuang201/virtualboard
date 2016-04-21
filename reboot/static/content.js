var VBoard = VBoard || {};
(function (vb) {

	vb.content = {
		loadChessGame: function () {
			var chessData = {
				"background" : vb.board.background.name,
				"privateZones" : [],
				"pieces" : [
					{
						"pos" : [0, 0],
						"icon" : "/static/img/checkerboard.png",
						"color" : [255, 255, 255],
						"r" : 0,
						"s" : 16,
						"static" : 1,
					},
					this.loadChessGameHelper("nbking", -1,  7),
					this.loadChessGameHelper("nwking",  1, -7),
					this.loadChessGameHelper("nbqueen",  1,  7),
					this.loadChessGameHelper("nwqueen", -1, -7),

					this.loadChessGameHelper("nbrook",  7,  7),
					this.loadChessGameHelper("nbrook", -7,  7),
					this.loadChessGameHelper("nwrook",  7, -7),
					this.loadChessGameHelper("nwrook", -7, -7),

					this.loadChessGameHelper("nbknight",  5,  7),
					this.loadChessGameHelper("nbknight", -5,  7),
					this.loadChessGameHelper("nwknight",  5, -7),
					this.loadChessGameHelper("nwknight", -5, -7),

					this.loadChessGameHelper("nbbishop",  3,  7),
					this.loadChessGameHelper("nbbishop", -3,  7),
					this.loadChessGameHelper("nwbishop",  3, -7),
					this.loadChessGameHelper("nwbishop", -3, -7)
				]
			};

			for(var x = -7; x < 8; x += 2) {
				chessData["pieces"].push(this.loadChessGameHelper("nbpawn", x, 5));
				chessData["pieces"].push(this.loadChessGameHelper("nwpawn", x, -5));
			}
			vb.sessionIO.loadBoardState(chessData);
		},

		loadChessGameHelper: function (subicon, x, y) {
			return {
				"icon" : "/static/img/" + subicon + ".png",
				"color" : [255, 255, 255],
				"r" : 0,
				"s" : 2,
				"static" : 0,
				"pos" : [x, y]
			};
		},

		loadCheckersGame: function () {
			var checkersData = {
				"background" : vb.board.background.name,
				"privateZones" : [],
				"pieces" : [
					{
						"pos" : [0, 0],
						"icon" : "/static/img/checkerboard.png",
						"color" : [255, 255, 255],
						"r" : 0,
						"s" : 16,
						"static" : 1,
					}
				]
			};

			for(var x = -7; x < 8; x += 2) {
				for(var y = -7; y < 8; y += 2) {
					//this is literally javascript having an incorrect implementation of modulus
					if(((x + y)/2) % 2 == 1 || ((x + y)/2) % 2 == -1) {
						if(y < -2) {
							checkersData["pieces"].push(this.loadChessGameHelper("nwpawn", x, y));
						} else if(y > 2) {
							checkersData["pieces"].push(this.loadChessGameHelper("nbpawn", x, y));
						}
					}
				}
			}
			vb.sessionIO.loadBoardState(checkersData);
		},

		createDefaultDeck: function () {
			var properties = {
				"pos" : [vb.camera.position.x, vb.camera.position.y],
				"icon" : "/static/img/card/cardback.png",
				"s" : 4,
				"r" : Math.atan2(vb.camera.upVector.y, vb.camera.upVector.x) - Math.PI/2,
				"cardData" : {
					"count" : 52,
					"shuffle" : 1,

					//by sending an empty cards array, default pieces will be used
					"cards" : []
				}
			};
			vb.sessionIO.addPiece(properties);
		},

		// below are test functions 
		createChessBoard: function() {
			// Parameters
		    var xmin = -12;
		    var zmin = -12;
		    var xmax =  12;
		    var zmax =  12;
		    var precision = {
		        "w" : 2,
		        "h" : 2
		    };
		    var subdivisions = {
		        'h' : 8,
		        'w' : 8
		    };
		    // Create the Tiled Ground
		    var tiledGround = new BABYLON.Mesh.CreateTiledGround("Tiled Ground", xmin, zmin, xmax, zmax, subdivisions, precision, VBoard.scene);

		    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
			var whiteMaterial = new BABYLON.StandardMaterial("White", VBoard.scene);
			whiteMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
			 
			var blackMaterial = new BABYLON.StandardMaterial("Black", VBoard.scene);
			blackMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
			
			var multimat = new BABYLON.MultiMaterial("multi", VBoard.scene);
			multimat.subMaterials.push(whiteMaterial);
			multimat.subMaterials.push(blackMaterial);
			multimat.backFaceCulling = false;
			
			tiledGround.material = multimat;

			var verticesCount = tiledGround.getTotalVertices();
			var tileIndicesLength = tiledGround.getIndices().length / (subdivisions.w * subdivisions.h);

			tiledGround.subMeshes = [];
			var base = 0;
			for (var row = 0; row < subdivisions.h; row++) {
			    for (var col = 0; col < subdivisions.w; col++) {
			         tiledGround.subMeshes.push(new BABYLON.SubMesh(row%2 ^ col%2, 0, verticesCount, base, tileIndicesLength, tiledGround));
			         base += tileIndicesLength;
			     }
			}
		}
	};
})(VBoard);
