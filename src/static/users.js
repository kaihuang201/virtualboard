var VBoard = VBoard || {};
(function (vb) {

	vb.users = {
		//members
		local: null,
		host: null,
		userList: {},	//unordered
						//maps ids to user objects


		//constructor for internal object
		//User: function (id, name, color, isLocal, isHost) {
		//	//the downside to this construction is that accessing vb.user's methods is not as clean
		//	this.id = id;
		//	this.name = name;
		//	this.color = color;
		//	this.isLocal = isLocal;
		//	this.isHost = isHost;
		//	this.ping = -1;
		// },

		//methods

		// Adds a user
		add: function (user) {
			this.userList[user.id] = user;
		},

		// Removes a user
		remove: function (user) {
			delete this.userList[user.id];
		},

		// Removes a user based on userData JSON object
		removeUser: function (userData) {
			var id = userData["user"];
			var user = this.userList[id];
			this.remove(user);
		},

		// Returns the user with the given id, or null if none exists
		getFromID: function (id) {
			if(this.userList.hasOwnProperty(id)) {
				return this.userList[id];
			}
			return null;
		},

		// Sets the given user as the local user
		setLocal: function (user) {
			this.local = user;
		},

		// Returns the local user
		getLocal: function () {
			return this.local;
		},

		// returns the host
		getHost: function () {
			return this.host;
		},

		// Sets a the color of a user specified by id to the given color
		changeUserColor: function (userID, colorArr) {
			var user = this.userList[userID];
			var bcolor = new BABYLON.Color3(colorArr[0]/255, colorArr[1]/255, colorArr[2]/255);
			this.changeColor(user, bcolor);
		},

		// Sets a users color
		changeColor: function (user, color) {
			user.color = color;
			//TODO: maybe other stuff needs updating too
		},

		// Sets the game's host to the user with the given id
		changeHost: function (id) {
			var newHost = this.userList[id];
			this.userList[this.host.id].isHost = false;
			newHost.isHost = true;
			this.host = newHost;

			//TODO: message to local user?
			//probably not in this function
		},

		// Creates a new user from the given userData
		createNewUser: function (userData) {
			var id = userData["user"];
			var name = userData["name"];
			var color = new BABYLON.Color3(	userData["color"][0]/255,
											userData["color"][1]/255,
											userData["color"][2]/255 );
			var isLocal = userData["local"] == 1;
			var isHost = userData["host"] == 1;

			var user = {
				"id" : id,
				"name" : name,
				"color" : color,
				"isLocal" : isLocal,
				"isHost" : isHost,
				"ping" : -1
			};

			if(isLocal) {
				this.local = user;
			}

			if(isHost) {
				this.host = user;
			}
			this.add(user);
		}
	};
})(VBoard);
