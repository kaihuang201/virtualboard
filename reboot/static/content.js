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
					//this is literally javascript having a correct implementation of modulus
					if(((x + y)/2) % 2 != 0) {
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
		},

		loadRiskGame: function () {
			var territories = [];

			//load 42 territories
			for(var i=1; i<=14; i++) {
				for(var j=1; j<=3; j++) {
					territories.push({
						"icon" : "/static/img/risk/cards/" + j + "_r" + i + ".png",
						"faceDown" : 1
					});
				}
			}

			//add 2 wild cards
			territories.push({
				"icon" : "/static/img/risk/cards/wild.png",
				"faceDown" : 1
			});
			territories.push({
				"icon" : "/static/img/risk/cards/wild.png",
				"faceDown" : 1
			});

			var riskData = {
				"background" : vb.board.background.name,
				"privateZones" : [
					{
						"pos" : [0, 8.5],
						"size" : [10, 2],
						"r" : 0,
						"color" : [255, 67, 81]
					},
					{
						"pos" : [15.5, 0],
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
						"pos" : [-15.5, 0],
						"size" : [2, 10],
						"r" : 0,
						"color" : [254, 174, 27]
					},
				],
				"pieces" : [
					{
						"pos" : [0, 0],
						"icon" : "/static/img/risk/risk_deluxe_by_aerosoulz.jpg",
						"color" : [255, 255, 255],
						"r" : 0,
						"s" : 13,
						"static" : 1,
					},
					{
						"pos" : [12.0, -4.75],
						"icon" : "/static/img/risk/back.png",
						"s" : 2.0,
						"r" : 0,
						"color" : [255, 255, 255],
						"static" : 0,
						"cardData" : {
							"count" : territories.length,
							"shuffle" : 1,
							"cards" : territories
						}
					}
				]
			};

			//add preset pieces
			var offsetxs = [10.0, 14.0, -14.0, -10.0];
			var offsetys = [10.5, -9.5, 10.5, -9.5];
			var colors = [[255, 0, 0], [0, 255, 0], [255, 255, 65], [0, 0, 255]];

			for(var index = 0; index < colors.length; index++) {

				var offsetx = offsetxs[index];
				var offsety = offsetys[index];
				var color = colors[index];

				for(var i=0; i<10; i++) {
					var pieceData1 = {
						"icon" : "/static/img/risk/pieces/soldier white.png",
						"color" : color,
						"s" : 1.0,
						"pos" : [offsetx + i - 4.5, offsety + 1.0],
						"static" : 0,
						"r" : 0.0
					};
					riskData.pieces.push(pieceData1);
					var pieceData2 = {
						"icon" : "/static/img/risk/pieces/soldier white.png",
						"color" : color,
						"s" : 1.0,
						"pos" : [offsetx + i - 4.5, offsety - 1.0],
						"static" : 0,
						"r" : 0.0
					};
					riskData.pieces.push(pieceData2);

					if(i < 5) {
						var pieceData3 = {
							"icon" : "/static/img/risk/pieces/horse white.png",
							"color" : color,
							"s" : 1.0,
							"pos" : [offsetx + i - 4.5, offsety - 3.0],
						"static" : 0,
						"r" : 0.0
						};
						riskData.pieces.push(pieceData3);
					} else {
						var pieceData3 = {
							"icon" : "/static/img/risk/pieces/cannon white.png",
							"color" : color,
							"s" : 1.0,
							"pos" : [offsetx + i - 4.5, offsety - 3.0],
						"static" : 0,
						"r" : 0.0
						};
						riskData.pieces.push(pieceData3);
					}
				}
			}

			//add dice
			for(var i=0; i<5; i++) {
				if(i < 3) {
					var color = [255, 255, 255];
				} else {
					var color = [100, 100, 180];
				}

				var pieceData = {
					"icon" : "/static/img/die_face/small_die_face_1.png",
					"pos" : [12.0, i - 3.0],
					"s" : 1.0,
					"static" : 0,
					"r" : 0.0,
					"color" : color,
					"diceData" : {
						"max" : 6,
						"faces" : [],
						"isUserPicker" : 0
					}
				};
				riskData.pieces.push(pieceData);
			}
			vb.sessionIO.loadBoardState(riskData);
		}
	};
})(VBoard);
