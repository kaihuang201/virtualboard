var PieceMap = PieceMap || {};
(function (pieceMap) {
	pieceMap.pieces =  {
			"chessKingBlack" : {
				"size" : 2.0,
				"icon" : "nbking.png"
			},
			"chessQueenBlack" : {
				"size" : 2.0,
				"icon" : "nbqueen.png"
			},
			"chessKnightBlack" : {
				"size" : 2.0,
				"icon" : "nbknight.png"
			},
			"chessBishopBlack" : {
				"size" : 2.0,
				"icon" : "nbbishop.png"
			},
			"chessRookBlack" : {
				"size" : 2.0,
				"icon" : "nbrook.png"
			},
			"chessPawnBlack" : {
				"size" : 2.0,
				"icon" : "nbpawn.png"
			},
			"chessKingWhite" : {
				"size" : 2.0,
				"icon" : "nwking.png"
			},
			"chessQueenWhite" : {
				"size" : 2.0,
				"icon" : "nwqueen.png"
			},
			"chessKnightWhite" : {
				"size" : 2.0,
				"icon" : "nwknight.png"
			},
			"chessBishopWhite" : {
				"size" : 2.0,
				"icon" : "nwbishop.png"
			},
			"chessRookWhite" : {
				"size" : 2.0,
				"icon" : "nwrook.png"
			},
			"chessPawnWhite" : {
				"size" : 2.0,
				"icon" : "nwpawn.png"
			},
			"chessBoard" : {
				"size" : 16.0,
				"icon" : "background.png"
			},
			"penTool" : {
				"size" : 2.0,
				"icon" : "pen.png"
			}
		};
})(PieceMap);

var CardMap = CardMap || {};
(function (cardMap) {
	cardMap.cards =  {
			"joker" : {
				"size" : 4.0,
				"icon" : "cardback.png",
				"fronticon" : "cardfront.png"
			}
		};
})(CardMap);

var DieMap = DieMap || {};
(function (dieMap) {
	dieMap.dice = {
		"d6" : {
			"size" : 2.0,
			1 : "die_face_1.png",
			2 : "die_face_2.png",
			3 : "die_face_3.png",
			4 : "die_face_4.png",
			5 : "die_face_5.png",
			6 : "die_face_6.png"
		}
	};
})(DieMap);