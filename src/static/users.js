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
		add: function (user) {
			this.userList[user.id] = user;
		},

		remove: function (user) {
			delete this.userList[user.id];
		},

		removeUser: function (userData) {
			var id = userData["user"];
			var user = this.userList[id];
			this.remove(user);
		},

		getFromID: function (id) {
			if(this.userList.hasOwnProperty(id)) {
				return this.userList[id];
			}
			return null;
		},

		//to do: actual implementation
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

		changeUserColor: function (userID, colorArr) {
			var user = this.userList[userID];
			var bcolor = new BABYLON.Color3(colorArr[0]/255, colorArr[1]/255, colorArr[2]/255);
			this.changeColor(user, bcolor);
		},

		changeColor: function (user, color) {
			user.color = color;
			//TODO: maybe other stuff needs updating too
		},

		changeHost: function (id) {
			var newHost = this.userList[id];
			this.userList[this.host.id].isHost = false;
			newHost.isHost = true;
			this.host = newHost;

			//TODO: message to local user?
			//probably not in this function
		},

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
