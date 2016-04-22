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

		makeScrabbleTileArray: function (distribution) {
			var tiles = [];

			for (var key in distribution) {
				if (distribution.hasOwnProperty(key)) {
					for (var i = 0; i < distribution[key]; i++) {
						tiles.push({
							"icon" : "static/img/scrabble/" + key + "_tile.png",
							"faceDown" : 1
						});
					}
				}
			}

			return tiles;
		},

		loadScrabbleGame: function () {
			var distribution = {
				"wild" : 2,
				"e" : 12,
				"a" : 9,
				"i" : 9,
				"o" : 8,
				"n" : 6,
				"r" : 6,
				"t" : 6,
				"l" : 4,
				"s" : 4,
				"u" : 4,
				"d" : 4,
				"g" : 3,
				"b" : 2,
				"c" : 2,
				"m" : 2,
				"p" : 2,
				"f" : 2,
				"h" : 2,
				"v" : 2,
				"w" : 2,
				"y" : 2,
				"k" : 1,
				"j" : 1,
				"x" : 1,
				"q" : 1,
				"z" : 1
			};
			var tiles = this.makeScrabbleTileArray(distribution);

			var scrabbleData = {
				"background" : vb.board.background.name,
				"privateZones" : [
					{
						"pos" : [0, 8.5],
						"size" : [10, 2],
						"r" : 0,
						"color" : [255, 67, 81]
					},
					{
						"pos" : [8.5, 0],
						"size" : [2, 10],
						"r" : 0,
						"color" : [165, 222, 55]
					},
					{
						"pos" : [0, -8.5],
						"size" : [10, 2],
						"r" : 0,
						"color" : [27, 154, 247]
					},
					{
						"pos" : [-8.5, 0],
						"size" : [2, 10],
						"r" : 0,
						"color" : [254, 174, 27]
					},
				],
				"pieces" : [
					{
						"pos" : [0, 0],
						"icon" : "/static/img/scrabble/board.png",
						"color" : [255, 255, 255],
						"r" : 0,
						"s" : 15,
						"static" : 1,
					},
					{
						"pos" : [-6.351, -1.87],
						"icon" : "/static/img/scrabble/wild_tile.png",
						"s" : 0.8,
						"r" : 0,
						"color" : [255, 255, 255],
						"static" : 0,
						"cardData" : {
							"count" : tiles.length,
							"shuffle" : 1,
							"cards" : tiles
						}
					}
				]
			};

			vb.sessionIO.loadBoardState(scrabbleData);
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
