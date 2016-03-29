var VBoard = VBoard || {};
(function (vb) {

	vb.content = {
		loadChessGame: function () {
			var chessData = {
				"background" : "",
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
				"background" : "",
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
		}
	};
})(VBoard);
