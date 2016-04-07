import unittest
import json
import jsonschema
from jsonschema.validators import Draft4Validator

schema = {
	"$schema": "http://json-schema.org/draft-04/schema#",
	"type": "object",
	"oneOf": [ 
		{"$ref": "#/definitions/initJoin" },
		{"$ref": "#/definitions/initHost" },
		{"$ref": "#/definitions/listGames" },
		{"$ref": "#/definitions/gameIDExists" },
		{"$ref": "#/definitions/ping" },
		{"$ref": "#/definitions/chat" },
		{"$ref": "#/definitions/beacon" },
		{"$ref": "#/definitions/pieceTransform" },
		{"$ref": "#/definitions/pieceAdd" },
		{"$ref": "#/definitions/pieceRemove" },
		{"$ref": "#/definitions/setBackground" },
		{"$ref": "#/definitions/disconnect" },
		{"$ref": "#/definitions/listClients" },
		{"$ref": "#/definitions/changeColor" },
		{"$ref": "#/definitions/rollDice" },
		{"$ref": "#/definitions/flipCard" },
		{"$ref": "#/definitions/createDeck" },
		{"$ref": "#/definitions/addCardPieceToDeck" },
		{"$ref": "#/definitions/addCardTypeToDeck" },
		{"$ref": "#/definitions/drawCard" },
		{"$ref": "#/definitions/createPrivateZone" },
		{"$ref": "#/definitions/removePrivateZone" },
		{"$ref": "#/definitions/drawScribble" },
		{"$ref": "#/definitions/changeHost" },
		{"$ref": "#/definitions/announcement" },
		{"$ref": "#/definitions/changeServerInfo" },
		{"$ref": "#/definitions/kickUser" },
		{"$ref": "#/definitions/clearBoard" },
		{"$ref": "#/definitions/closeServer" },
		{"$ref": "#/definitions/loadBoardState" }
	],
	
	"definitions": {
		"initJoin": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "initJoin" ] },
				"data": {
					"type": "object",
					"properties": {
						"name": { "type": "string" },
						"color": {
							"type": "array",
							"items": {
								"type": "integer" 
							},
							"minItems": 3,
							"maxItems": 3
    					},
    					"gameID": { "type": "integer" },
    					"password": { "type": "string" }
  					},
  					"required": [ "name", "color", "gameID", "password" ]
				}
			},
			"required": [ "type", "data" ]
		},
		"initHost": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "initHost" ] },
				"data": {
					"type": "object",
					"properties": {
						"name": { "type": "string" },
						"color": {
							"type": "array",
							"items": {
								"type": "integer" 
							},
							"minItems": 3,
							"maxItems": 3
    					},
    					"gameName": { "type": "string" },
    					"password": { "type": "string" }
  					},
  					"required": [ "name", "color", "gameName", "password" ]
				}
			},
			"required": [ "type", "data" ]
		},
		"listGames": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "listGames" ] }
			},
			"required": [ "type" ]
		},
		"gameIDExists": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "gameIDExists" ] },
				"data": { 
					"gameID": {"type", "integer"}
				}
			},
			"required": [ "type","data" ]
		},
		"ping": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "ping" ] }
			},
			"required": [ "type" ]
		},
		"chat": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "chat" ] },
				"data": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": { 
							"msg": {
								"type":"string"
							}
						},
						"required":["msg"]
					},
				}
			},
			"required": [ "type", "data" ]
		},
		
		"beacon": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "beacon" ] },
				"data": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"pos": {
								"type": "array",
								"items": [
									{ "type": "number" },
									{ "type": "number" }
								],
								"required": [ "0", "1" ]
							}
						},
						"required":[ "pos" ]
					},
					"required":[ "0" ]}
			},
			"required": [ "type", "data" ]
		},
		"pieceTransform": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "pieceTransform" ] },
				"data": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": { 
							"piece": { "type":"integer" }, 
							"p": { "type": "integer" },
							"icon": { "type":"string" },
							"pos": {
								"type": "array",
								"items": { "type":"number" },
								"minItems": 2,
								"maxItems": 2
							},
							"r": { "type":"number" },
							"s": { "type":"number" },
							"color": {
								"type":"array",
								"items": { "type":"integer" },
								"minItems": 3,
								"maxItems": 3
							},
							"static": { "type":"integer" }
						},
						"required": [ "piece", "p", "icon", "pos", "r", "s", "color", "static" ]
					},
					"minItems": 1
				}
			},
			"required": [ "type", "data" ]
		},
		"pieceAdd": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "pieceAdd" ] },
				"data": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": { 
							"icon": { "type":"string" },
							"pos": { 
								"type": "array",
								"items": { "type":"number" },
								"minItems": 2,
								"maxItems": 2
							},
							"color": {
								"type":"array",
								"items": { "type":"integer" },
								"minItems": 3,
								"maxItems": 3
							},
							"r": { "type":"number" },
							"s": { "type":"number" },
							"static": { "type":"integer" }, 
							"cardData": { 
								"type":"object",
								"properties": {
									"faceDown": { "type":"integer"},
									"backIcon": { "type":"string" }
								}
							},
							"diceData": {
								"type":"object",
								"properties": { 
									"min": { "type":"integer" },
									"max": { "type":"integer" },
									"faces": { 
										"type": "array",
										"items": { "type":"string" }
									}
								}
							}
						},
						"required": [ "icon","pos","color","r","s","static","cardData","diceData" ]
					},
					"minItems": 1
				}
			},
			"required": [ "type", "data" ]
		},
		"pieceRemove": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "pieceRemove" ] },
				"data": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"piece": {
								"id": "piece",
								"type": "integer"
							}
							},
							"required": [
							"piece"
							]
							},
							"required": [
							"0"
							]
						}
			},
			"required": [ "type", "data" ]
		},
		"setBackground": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "setBackground" ] },
				"data": {
					"type": "object",
					"properties": {
						"icon": {
							"id": "icon",
							"type": "string"
						}
						},
						"required": [
						"icon"
						]
					}
					},
					"required": [ "type", "data" ]
		},
		"disconnect": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "disconnect" ] },
				"data": {
					"type": "object",
					"properties": {
						"msg": { "type":"string" }
					},
					"required": ["msg"] }
			},
			"required": [ "type", "data" ]
		},
		"listClients": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "listClients" ] },
			},
			"required": [ "type" ]
		},
		"changeColor": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "changeColor" ] },
				"data": {
					"type": "object",
					"properties": {
						"color": {
							"type":"array",
							"items": { "type":"integer" },
							"minItems": 3,
							"maxItems": 3
						}
					},
					"required": [ "color" ]
				}
			},
			"required": [ "type", "data" ]
		},
		"rollDice": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "rollDice" ] },
				"data": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"piece": { "type":"integer" }
						},
						"required": [ "piece" ] 
					},
					"minItems": 1
				}
			},
			"required": [ "type", "data" ]
		},
		"flipCard": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "flipCard" ] },
				"data": {
					"type":"array",
					"items": {
						"type":"object",
						"properties":{
							"piece":{"type":"integer"}
						},
						"required":["piece"]
					},
				"required":["0"]}
			},
			"required": [ "type", "data" ]
		},
		"createDeck": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "createDeck" ] },
				"data": {
					"type": "array",
					"items": {
						"type": "object",
						"properties" : {
							"icon": { "type":"string" },
							"color": {
								"type":"array",
								"items": [ {"type":"integer"} ],
								"minItems": 3,
								"maxItems": 3
							},
							"pos": { 
								"type": "array",
								"items": [ {"type": "number"} ],
								"minItems": 2,
								"maxItems": 2
							},
							"r": { "type":"number" },
							"s": { "type":"number" },
							"static": { "type":"integer" }
						}, 
						"required": [ "icon","color","pos","r","s","static" ]
					},
					"minItems": 1
				}
			},
			"required": [ "type", "data" ]
		},
		"addCardPieceToDeck": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "addCardPieceToDeck" ] },
				"data": {"$schema":"http://json-schema.org/draft-04/schema#","id":"/","type":"array","items":{"id":"0","type":"object","properties":{"deck":{"id":"deck","type":"integer"},"card":{"id":"card","type":"integer"}},"required":["deck","card"]},"required":["0"]}
			},
			"required": [ "type", "data" ]
		},
		"addCardTypeToDeck": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "addCardTypeToDeck" ] },
				"data": {"$schema":"http://json-schema.org/draft-04/schema#","id":"/","type":"array","items":{"id":"0","type":"object","properties":{"deck":{"id":"deck","type":"integer"},"card":{"id":"card","type":"string"}},"required":["deck","card"]},"required":["0"]}
			},
			"required": [ "type", "data" ]
		},
		"drawCard": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "drawCard" ] },
				"data": {"$schema":"http://json-schema.org/draft-04/schema#","id":"http://jsonschema.net","type":"array","items":{"id":"http://jsonschema.net/0","type":"object","properties":{"deck":{"id":"http://jsonschema.net/0/deck","type":"integer"}},"required":["deck"]},"required":["0"]}
			},
			"required": [ "type", "data" ]
		},
		"createPrivateZone": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "createPrivateZone" ] },
				"data": {"$schema":"http://json-schema.org/draft-04/schema#","id":"http://jsonschema.net","type":"array","items":{"id":"http://jsonschema.net/0","type":"object","properties":{"color":{"id":"http://jsonschema.net/0/color","type":"array","items":[{"id":"http://jsonschema.net/0/color/0","type":"integer"},{"id":"http://jsonschema.net/0/color/1","type":"integer"},{"id":"http://jsonschema.net/0/color/2","type":"integer"}],"required":["0","1","2"]},"pos":{"id":"http://jsonschema.net/0/pos","type":"array","items":[{"id":"http://jsonschema.net/0/pos/0","type":"number"},{"id":"http://jsonschema.net/0/pos/1","type":"number"}]},"size":{"id":"http://jsonschema.net/0/size","type":"array","items":[{"id":"http://jsonschema.net/0/size/0","type":"integer"},{"id":"http://jsonschema.net/0/size/1","type":"integer"}]},"r":{"id":"http://jsonschema.net/0/r","type":"number"}},"required":["color","pos","size","r"]},"required":["0"]}
			},
			"required": [ "type", "data" ]
		},
		"removePrivateZone": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "removePrivateZone" ] },
				"data": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"id": { "type":"integer" }
						},
						"required": [ "id" ]
					},
					"minItems": 1
				}
			},
			"required": [ "type", "data" ]
		},
		"drawScribble": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "drawScribble" ] },
				"data": {"$schema":"http://json-schema.org/draft-04/schema#","id":"http://jsonschema.net","type":"array","items":{"id":"http://jsonschema.net/0","type":"object","properties":{"ttl":{"id":"http://jsonschema.net/0/ttl","type":"integer"},"points":{"id":"http://jsonschema.net/0/points","type":"array","items":[{"id":"http://jsonschema.net/0/points/0","type":"array","items":[{"id":"http://jsonschema.net/0/points/0/0","type":"number"},{"id":"http://jsonschema.net/0/points/0/1","type":"number"}]},{"id":"http://jsonschema.net/0/points/1","type":"array","items":[{"id":"http://jsonschema.net/0/points/1/0","type":"number"},{"id":"http://jsonschema.net/0/points/1/1","type":"number"}]},{"id":"http://jsonschema.net/0/points/2","type":"array","items":[{"id":"http://jsonschema.net/0/points/2/0","type":"number"},{"id":"http://jsonschema.net/0/points/2/1","type":"number"}]}]}},"required":["ttl","points"]},"required":["0"]}
			},
			"required": [ "type", "data" ]
		},
		"changeHost": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "changeHost" ] },
				"data": {"$schema":"http://json-schema.org/draft-04/schema#","id":"http://jsonschema.net","type":"object","properties":{"user":{"id":"http://jsonschema.net/user","type":"integer"},"msg":{"id":"http://jsonschema.net/msg","type":"string"}},"required":["user","msg"]}
			},
			"required": [ "type", "data" ]
		},
		"announcement": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "announcement" ] },
				"data": {"$schema":"http://json-schema.org/draft-04/schema#","id":"http://jsonschema.net","type":"object","properties":{"msg":{"id":"http://jsonschema.net/msg","type":"string"}},"required":["msg"]}
			},
			"required": [ "type", "data" ]
		},
		"changeServerInfo": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "changeServerInfo" ] },
				"data": {"$schema":"http://json-schema.org/draft-04/schema#","id":"http://jsonschema.net","type":"object","properties":{"name":{"id":"http://jsonschema.net/name","type":"string"},"password":{"id":"http://jsonschema.net/password","type":"string"}},"required":["name","password"]}
			},
			"required": [ "type", "data" ]
		},
		"kickUser": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "kickUser" ] },
				"data": {"$schema":"http://json-schema.org/draft-04/schema#","id":"http://jsonschema.net","type":"object","properties":{"user":{"id":"http://jsonschema.net/user","type":"integer"},"msg":{"id":"http://jsonschema.net/msg","type":"string"}},"required":["user","msg"]}
			},
			"required": [ "type", "data" ]
		},
		"clearBoard": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "clearBoard" ] }
			},
			"required": [ "type" ]
		},
		"closeServer": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "closeServer" ] }
			},
			"required": [ "type" ]
		},
		"loadBoardState": {
			"type": "object",
			"properties": {
				"type": { "enum": [ "loadBoardState" ] },
				"data": {
					"type": "object",
					"properties": {
						"background": { "type":"string" },
						"privateZones": {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"pos": {
										"type": "array",
										"items": [ { "type":"number" } ],
										"minItems": 2,
										"maxItems": 2
									},
									"size": {
										"type": "array",
										"items": [ { "type":"integer" } ],
										"minItems": 2,
										"maxItems": 2
									},
									"r": { "type":"integer" },
									"color": { 
										"type":"array",
										"items": [ { "type":"integer" } ],
										"minItems": 3,
										"maxItems": 3
									}
								}
							}
						},
						"pieces": { 
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"pos": {
										"type": "array",
										"items": [ { "type":"number" } ],
										"minItems": 2,
										"maxItems": 2
									},
									"icon": { "type":"string" },
									"color": { 
										"type":"array",
										"items": [ { "type":"integer" } ],
										"minItems": 3,
										"maxItems": 3
									},
									"static": { "type":"integer" },
									"r": { "type":"number" },
									"s": { "type":"number" },
									"cardData": {
										"type": "object",
										"properties": {
											"faceDown": { "type":"integer" },
											"backIcon": { "type":"string" }
										}
									},
									"diceData": {
										"type": "object",
										"properties": {
											"min": { "type":"integer" },
											"max": { "type":"integer" },
											"faces": { 
												"type":"array",
												"items": [ { "type":"string" } ],
												"minItems": 1
											}
										}
									}
								}
							}
						}
					},
					"required": [ "background", "privateZones", "pieces"]}
			},
			"required": [ "type", "data" ]
		}
	} }

class TestSocketProtocolSchema(unittest.TestCase):

	def test_initJoin(self):
		initJoin_json = '{ "type" : "initJoin", "data" : { "name" : "fred", "color" : [ 0, 255, 0 ], "gameID" : 2, "password" : "12345" } }'
		data = json.loads(initJoin_json)
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_initHost(self):
		data = json.loads('{"type" : "initHost", "data" : {"name" : "sam", "color" : [255, 0, 0 ], "gameName" : "coolville", "password" : "12345"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_listGames(self):
		data = json.loads('{"type" : "listGames"}')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_gameIDExists(self):
		data = json.loads('{"type" : "gameIDExists", "data" : {"gameID" : 3}}')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_ping(self):
		data = json.loads('{"type" : "ping", "data" : {"msg" : "sequence number or something"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_chat(self):
		data = json.loads('{"type" : "chat", "data" : [{"msg" : "actual text here"} ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_beacon(self):
		data = json.loads('{"type" : "beacon", "data" : [{"pos" : [54.5435, 0.534 ] } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_pieceTransform(self):
		data = json.loads('{"type" : "pieceTransform", "data" :  [{"piece" : 3, "p" : 3, "icon" : "/res/img.png", "pos" : [6.98721345, 90.6532 ], "r" : 0.45656, "s" : 1.0, "color" : [0, 0, 0 ], "static" : 1 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_pieceAdd(self):
		data = json.loads('{"type" : "pieceAdd", "data" : [{"piece" : 6, "user" : 4, "icon" : "/res/img.png", "static" : 0, "color" : [255, 255, 255 ], "pos" : [6.6435, 65.2543 ], "r" : 0.45656, "s" : 1.0, "cardData" : {"faceDown" : 0, "backIcon" : "/res/cardback.png"}, "diceData" : {"min" : 1, "max" : 6, "faces" : ["/res/dice1.png", "/res/dice2.png", "/res/dice3.png", "/res/dice4.png", "/res/dice5.png", "/res/dice6.png"] } } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_pieceRemove(self):
		data = json.loads('{"type" : "pieceRemove", "data" : [{"piece" : 6, "user" : 4 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_setBackground(self):
		data = json.loads('{"type" : "setBackground", "data" : {"icon" : "/res/img/background.png"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_disconnect(self):
		data = json.loads('{"type" : "disconnect", "data" : {"msg" : "brb food"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_listClients(self):
		data = json.loads('{"type" : "listClients"}')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_changeColor(self):
		data = json.loads('{"type" : "changeColor", "data" : {"color" : [0, 255, 0 ] } }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_rollDice(self):
		data = json.loads('{"type" : "rollDice", "data" : [{"piece" : 12 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_flipCard(self):
		data = json.loads('{"type" : "flipCard", "data" : [{"piece" : 5 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_createDeck(self):
		data = json.loads('{"type" : "createDeck", "data" : [{"icon" : "/res/deckicon.png", "color" : [255, 255, 255 ], "pos" : [6.6435, 65.2543 ], "r" : 0.45656, "s" : 1.0, "static" : 0 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_addCardPieceToDeck(self):
		data = json.loads('{"type" : "addCardPieceToDeck", "data" : [{"deck" : 7, "card" : 3 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_addCardTypeToDeck(self):
		data = json.loads('{"type" : "addCardTypeToDeck", "data" : [{"deck" : 7, "card" : "/res/kingclubs.png"} ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_drawCard(self):
		data = json.loads('{"type" : "drawCard", "data" : [{"deck" : 7 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_createPrivateZone(self):
		data = json.loads('{"type" : "createPrivateZone", "data" : [{"color" : [255, 0, 0 ], "pos" : [1.045, -8.53 ], "size" : [7, 2 ], "r" : 3.14159265 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_removePrivateZone(self):
		data = json.loads('{"type" : "removePrivateZone", "data" : [{"id" : 3 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_drawScribble(self):
		data = json.loads('{"type" : "drawScribble", "data" : [{"ttl" : 10, "points" : [[-6.573456, 1.54352 ], [-6.4652, 1.462453 ], [-6.4642, 1.41877 ] ] } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_changeHost(self):
		data = json.loads('{"type" : "changeHost", "data" : {"user" : 2, "msg" : "he paid me $5 to make him host"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_announcement(self):
		data = json.loads('{"type" : "announcement", "data" : {"msg" : "this is important"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_changeServerInfo(self):
		data = json.loads('{"type" : "changeServerInfo", "data" : {"name" : "coolville 2", "password" : "542512"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_kickUser(self):
		data = json.loads('{"type" : "kickUser", "data" : {"user" : 1, "msg" : "stop scribbling everywhere"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_clearBoard(self):
		data = json.loads('{"type" : "clearBoard"}')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_closeServer(self):
		data = json.loads('{"type" : "closeServer"}')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_loadBoardState(self):
		data = json.loads('{"type" : "loadBoardState", "data" : {"background" : "/res/img/background.png", "privateZones" : [{"pos" : [5.426, -7.234 ], "size" : [2, 5 ], "r" : 0, "color" : [255, 0, 0 ] } ], "pieces" : [{"pos" : [5.734, 3.64 ], "icon" : "static/img/crown.png", "color" : [255, 0, 0 ], "static" : 0, "r" : 3.14159, "s" : 1.0, "cardData" : {"faceDown" : 0, "backIcon" : "/res/cardback.png"}, "diceData" : {"min" : 1, "max" : 6, "faces" : ["/res/dice1.png", "/res/dice2.png", "/res/dice3.png", "/res/dice4.png", "/res/dice5.png", "/res/dice6.png"] } } ] } }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	#Failure Tests - still working on them
	def test_initJoin2(self):
		initJoin_json = '{ "type" : "initJoin", "data" : { "name" : "fred", "color" : [ 0, 255, 0 ], "gameID" : 2, "password" : "12345" } }'
		data = json.loads(initJoin_json)
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_initHost2(self):
		data = json.loads('{"type" : "initHost", "data" : {"name" : "sam", "color" : [255, 0, 0 ], "gameName" : "coolville", "password" : "12345"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_listGames2(self):
		data = json.loads('{"type" : "listGames"}')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_gameIDExists2(self):
		data = json.loads('{"type" : "gameIDExists", "data" : {"gameID" : 3}}')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_ping2(self):
		data = json.loads('{"type" : "ping", "data" : {"msg" : "sequence number or something"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_chat2(self):
		data = json.loads('{"type" : "chat", "data" : [{"msg" : "actual text here"} ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_beacon2(self):
		data = json.loads('{"type" : "beacon", "data" : [{"pos" : [54.5435, 0.534 ] } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_pieceTransform2(self):
		data = json.loads('{"type" : "pieceTransform", "data" :  [{"piece" : 3, "p" : 3, "icon" : "/res/img.png", "pos" : [6.98721345, 90.6532 ], "r" : 0.45656, "s" : 1.0, "color" : [0, 0, 0 ], "static" : 1 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_pieceAdd2(self):
		data = json.loads('{"type" : "pieceAdd", "data" : [{"piece" : 6, "user" : 4, "icon" : "/res/img.png", "static" : 0, "color" : [255, 255, 255 ], "pos" : [6.6435, 65.2543 ], "r" : 0.45656, "s" : 1.0, "cardData" : {"faceDown" : 0, "backIcon" : "/res/cardback.png"}, "diceData" : {"min" : 1, "max" : 6, "faces" : ["/res/dice1.png", "/res/dice2.png", "/res/dice3.png", "/res/dice4.png", "/res/dice5.png", "/res/dice6.png"] } } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_pieceRemove2(self):
		data = json.loads('{"type" : "pieceRemove", "data" : [{"piece" : 6, "user" : 4 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_setBackground2(self):
		data = json.loads('{"type" : "setBackground", "data" : {"icon" : "/res/img/background.png"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_disconnect2(self):
		data = json.loads('{"type" : "disconnect", "data" : {"msg" : "brb food"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_listClients2(self):
		data = json.loads('{"type" : "listClients"}')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_changeColor2(self):
		data = json.loads('{"type" : "changeColor", "data" : {"color" : [0, 255, 0 ] } }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_rollDice2(self):
		data = json.loads('{"type" : "rollDice", "data" : [{"piece" : 12 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_flipCard2(self):
		data = json.loads('{"type" : "flipCard", "data" : [{"piece" : 5 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_createDeck2(self):
		data = json.loads('{"type" : "createDeck", "data" : [{"icon" : "/res/deckicon.png", "color" : [255, 255, 255 ], "pos" : [6.6435, 65.2543 ], "r" : 0.45656, "s" : 1.0, "static" : 0 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_addCardPieceToDeck2(self):
		data = json.loads('{"type" : "addCardPieceToDeck", "data" : [{"deck" : 7, "card" : 3 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_addCardTypeToDeck2(self):
		data = json.loads('{"type" : "addCardTypeToDeck", "data" : [{"deck" : 7, "card" : "/res/kingclubs.png"} ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_drawCard2(self):
		data = json.loads('{"type" : "drawCard", "data" : [{"deck" : 7 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_createPrivateZone2(self):
		data = json.loads('{"type" : "createPrivateZone", "data" : [{"color" : [255, 0, 0 ], "pos" : [1.045, -8.53 ], "size" : [7, 2 ], "r" : 3.14159265 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_removePrivateZone2(self):
		data = json.loads('{"type" : "removePrivateZone", "data" : [{"id" : 3 } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_drawScribble2(self):
		data = json.loads('{"type" : "drawScribble", "data" : [{"ttl" : 10, "points" : [[-6.573456, 1.54352 ], [-6.4652, 1.462453 ], [-6.4642, 1.41877 ] ] } ] }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_changeHost2(self):
		data = json.loads('{"type" : "changeHost", "data" : {"user" : 2, "msg" : "he paid me $5 to make him host"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_announcement2(self):
		data = json.loads('{"type" : "announcement", "data" : {"msg" : "this is important"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_changeServerInfo2(self):
		data = json.loads('{"type" : "changeServerInfo", "data" : {"name" : "coolville 2", "password" : "542512"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_kickUser2(self):
		data = json.loads('{"type" : "kickUser", "data" : {"user" : 1, "msg" : "stop scribbling everywhere"} }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_clearBoard2(self):
		data = json.loads('{"type" : "clearBoard"}')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_closeServer2(self):
		data = json.loads('{"type" : "closeServer"}')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

	def test_loadBoardState2(self):
		data = json.loads('{"type" : "loadBoardState", "data" : {"background" : "/res/img/background.png", "privateZones" : [{"pos" : [5.426, -7.234 ], "size" : [2, 5 ], "r" : 0, "color" : [255, 0, 0 ] } ], "pieces" : [{"pos" : [5.734, 3.64 ], "icon" : "static/img/crown.png", "color" : [255, 0, 0 ], "static" : 0, "r" : 3.14159, "s" : 1.0, "cardData" : {"faceDown" : 0, "backIcon" : "/res/cardback.png"}, "diceData" : {"min" : 1, "max" : 6, "faces" : ["/res/dice1.png", "/res/dice2.png", "/res/dice3.png", "/res/dice4.png", "/res/dice5.png", "/res/dice6.png"] } } ] } }')
		global schema
		self.assertTrue(Draft4Validator(schema).is_valid(data))

if __name__ == '__main__':
    unittest.main()