function createSocket(connectCallback, messageCallback, disconnectCallback) {
	var socket = new WebSocket("ws://localhost:8000/game");
	socket.connectCallback = connectCallback;
	socket.messageCallback = messageCallback;
	socket.disconnectCallback = disconnectCallback;

	socket.onopen = function () {
		this.isConnected = true;

		if(this.connectCallback) {
			this.connectCallback();
		}
	};
	socket.onmessage = function (event) {
		console.log("websocket server response: " + event.data);

		if(this.messageCallback) {
			this.messageCallback(JSON.parse(event.data));
		}
	};
	socket.onclose = function () {
		this.isConnected = false;

		if(this.disconnectCallback) {
			this.disconnectCallback();
		}
		console.log("rip socket");
	};
	return socket;
}

QUnit.module("APITest", function(hooks) {

    hooks.beforeEach(function (assert) {

    });

    hooks.afterEach(function(assert) {

    });

    QUnit.test("Connect Test", function (assert) {
		var done = assert.async();
		var socket = createSocket(function () {
			var data = {
				"type" : "ping",
				"data" : {
					"seq" : 0
				}
			};
			socket.send(JSON.stringify(data));
			assert.ok(socket.isConnected, "socket should not have died");
			socket.close();
			done();
		});
	});

    QUnit.test("Ping Test", function (assert) {
		var done = assert.async();
		var socket = createSocket(function () {
			var data = {
				"type" : "ping",
				"data" : {
					"seq" : 6534
				}
			};
			socket.send(JSON.stringify(data));
			assert.ok(socket.isConnected, "socket should not have died");
		}, function (data) {
			assert.equal(data["type"], "pong", "assert response to ping");
			assert.equal(data["data"][0]["seq"], 6534, "server should echo our data back to us");
			socket.close();
			done();
		});
	});

    QUnit.test("List Games Test", function (assert) {
		var done = assert.async();
		var socket = createSocket(function () {
			var data = {
				"type" : "listGames"
			};
			socket.send(JSON.stringify(data));
			assert.ok(socket.isConnected, "socket should not have died");
		}, function (data) {
			assert.equal(data["type"], "listGames", "Verify correct response type");
			socket.close();
			done();
		});
	});

    QUnit.test("Host and List Games Value Test", function (assert) {
		var done = assert.async();
		var socket1 = createSocket(function () {
			socket1.send(JSON.stringify({
				"type" : "initHost",
				"data" : {
					"name" : "sam",
					"gameName" : "coolville673465",
					"password" : "12345",
					"color" : [255, 0, 0]
				}
			}));
			assert.ok(socket1.isConnected, "socket should not have died");
		}, function (data) {
			assert.equal(data["type"], "initSuccess", "verify that the host was able to initialize successfully");

			var socket2 = createSocket(function () {
				var data = {
					"type" : "listGames"
				};
				socket2.send(JSON.stringify(data));
			}, function (data) {
				assert.equal(data["type"], "listGames", "Verify correct response type");
				var len = data["data"].length;
				assert.ok(len > 0, "Verify that the list of games is not empty");
				var found = false;

				for(var i=0; i<len; i++) {
					if(data["data"][i]["name"] == "coolville673465") {
						found = true;
						break;
					}
				}
				assert.ok(found, "Verify that the new server is in the list returned");
				socket1.close();
				socket2.close();
				done();
			});
		});
	});

    QUnit.test("Join and Chat Test", function (assert) {
		var gameStr = "" + Math.random();
		var done = assert.async();
		var socket1 = createSocket(function () {
			socket1.send(JSON.stringify({
				"type" : "initHost",
				"data" : {
					"name" : "sam",
					"gameName" : "coolville" + gameStr,
					"password" : "12345",
					"color" : [255, 0, 0]
				}
			}));
			assert.ok(socket1.isConnected, "socket should not have died");
		}, function (data) {
			if(socket1.initDone) {
				if(socket1.fredDone) {
					if(socket1.chatDone) {
						assert.equal(data["type"], "userDisconnect", "sam should see fred leave");
						socket1.close();
						done();
					} else {
						assert.equal(data["type"], "chat", "host should see a chat message");

						if(data["data"][0]["user"] == socket1.user_id) {
							assert.equal(data["data"][0]["msg"], "hello fred, welcome to coolville", "sam should see his message");
						} else {
							assert.equal(data["data"][0]["msg"], "ani23tndiwengaykfawlf4b", "sam should see other message");
							socket1.chatDone = true;
						}
					}
				} else {
					assert.equal(data["type"], "userConnect", "host should see a new connection");
					assert.equal(data["data"][0]["name"], "fred", "connecting user should be fred");

					var chatmsg = {
						"type" : "chat",
						"data" : {
							"msg" : "hello fred, welcome to coolville"
						}
					};
					socket1.send(JSON.stringify(chatmsg));
					socket1.fredDone = true;
				}
			} else {
				assert.equal(data["type"], "initSuccess", "verify that the host was able to initialize successfully");
				assert.equal(data["data"]["users"][0]["name"], "sam", "verify that the only user is sam");
				socket1.user_id = data["data"]["users"][0]["id"];

				var socket2 = createSocket(function () {
					var data = {
						"type" : "listGames"
					};
					socket2.send(JSON.stringify(data));
				}, function (data) {
					if(socket2.gotlist) {
						if(socket2.connectDone) {
							assert.equal(data["type"], "chat", "next server message is chat");

							if(data["data"][0]["user"] == socket1.user_id) {
								assert.equal(data["data"][0]["msg"], "hello fred, welcome to coolville", "fred should see host message");
								socket2.send(JSON.stringify({
									"type" : "chat",
									"data" : {
										"msg" : "ani23tndiwengaykfawlf4b"
									}
								}));
							} else {
								assert.equal(data["data"][0]["msg"], "ani23tndiwengaykfawlf4b", "fred should see his message");
								socket2.close();
							}
						} else {
							assert.equal(data["type"], "initSuccess", "Verify correct response type");
							assert.equal(data["data"]["gameName"], "coolville" + gameStr, "Verify correct game name");
							assert.ok(socket2.isConnected, "host socket should not have died");
							socket2.connectDone = true;
						}
					} else {
						assert.equal(data["type"], "listGames", "Verify correct response type");
						var len = data["data"].length;
						assert.ok(len > 0, "Verify that the list of games is not empty");
						var id = -1;
	
						for(var i=0; i<len; i++) {
							if(data["data"][i]["name"] == "coolville" + gameStr) {
								id = data["data"][i]["id"];
								break;
							}
						}
						assert.ok(id != -1, "Verify that the new server is in the list returned");
						socket2.gotlist = true;
						var request = {
							"type" : "initJoin",
							"data" : {
								"name" : "fred",
								"gameID" : id,
								"password" : 12345,
								"color" : [0, 255, 0]
							}
						};
						socket2.send(JSON.stringify(request));
					}
				});
				socket1.initDone = true;
			}
		});
	});
});

