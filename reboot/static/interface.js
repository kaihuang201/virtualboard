var VBoard = VBoard || {};
(function (vb) {

	vb.cookie = {

		// functions for public use

		// set cookie function
		// adopted from http://www.w3schools.com/js/js_cookies.asp
		setCookie: function (userName, color, lobbyNo, expireMinutes) {
		    var d = new Date();
		    d.setTime(d.getTime() + (expireMinutes*60*1000));
		    var expires = "expires="+d.toUTCString();
		    document.cookie = "data=" + userName + "|" + vb.interface.arrayRGB2StrRGB(color) + "|" + lobbyNo + "; " + expires;

		    // console.log("data=" + userName + "|rgb(" + color.toString() + ")|" + lobbyNo + "; " + expires);
		},

		getUsername: function () {
			if (this.parseCookie().length == 0) return "";
			return (this.parseCookie())[0];
		},

		getUserColor: function () {
			if (this.parseCookie().length == 0) return [0,0,0];
			return vb.interface.strRGB2ArrayRGB((this.parseCookie())[1]);
		},
		getLobbyNo: function () {
			if (this.parseCookie().length == 0) return "";
			return parseInt((this.parseCookie())[2],10);
		},

		hasActiveCookie: function () {
		    var data=this.parseCookie();
		    if (data.length == 3) {
		        return true;
		    } else {
		    	return false;
		    }
		},

		deleteCookie: function () {
			document.cookie = 'data=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
		},

		// function for private use

		parseCookie: function () {
		    var name = "data=";
		    var ca = document.cookie.split(';');
		    for(var i=0; i<ca.length; i++) {
		        var c = ca[i];
		        while (c.charAt(0)==' ') c = c.substring(1);
		        if (c.indexOf(name) == 0) return (c.substring(name.length,c.length)).split('|');
		    }
		    return [];
		}
	};

	vb.interface = {
		// this is for color selected from the interface
		colorSelected: [0,0,0],
		colorLastSelectedStr: '',
		userName: "",
		autoGameListIntervalID: 0,

		// interface initializer
		init: function () {
			if (vb.cookie.hasActiveCookie()) {

				var usrnameFromCookie = vb.cookie.getUsername();
				var colorFromCookie = vb.cookie.getUserColor();
				var lobbyNoFromCookie = vb.cookie.getLobbyNo();
				vb.interface.setUserName(usrnameFromCookie,colorFromCookie);
				VBoard.interface.colorSelected = colorFromCookie;
				VBoard.interface.colorLastSelectedStr = vb.interface.arrayRGB2StrRGB(colorFromCookie);
				// show and assign the "resume game" button 
				$('#resume-game').show();
				$('#resume-game').unbind();
				$('#resume-game').on('click',function () {
					vb.interface.switchToResumeGameModal("last game session");
					$('#template-modal').modal("show");
					$('#template-modal #submit-btn-modal-template').unbind().on('click',function () {
						vb.interface.showLoading();
						vb.limboIO.joinGame(VBoard.interface.userName,colorFromCookie,lobbyNoFromCookie,$('#lobby-password').val());
					});
					

				});
			} else {
				vb.interface.userNamePrompt();
			}


			$("#create-lobby").on("click", function() {
				VBoard.interface.createLobbyRequest();
			});

			$("#listGames").on("click", function () {
				
				$("#template-modal").modal();

				var listOfLobbies = vb.interface.listLobbiesRequest();


			});

			// vb.interface.colorPickerInit();

			$('#change-username').on('click',function () {
				vb.interface.clearTemplateModalAlert();
				vb.interface.clearTemplateModal();
				vb.interface.userNamePrompt();
				$('#user-nickname').val(VBoard.interface.userName);
			});




			// automatic refresh game list
			VBoard.interface.autoGameListIntervalID = setInterval(function(){VBoard.limboIO.listGames();}, 20000);
			// enable tooltip @ bootstrap
			$('[data-toggle="tooltip"]').tooltip(); 

			$("#refresh-player-list").on("click",function () {vb.sessionIO.getClientList();});
		},

		colorPickerInit: function () {
			// adapted from
			// http://wanderinghorse.net/computing/javascript/jquery/colorpicker/demo-colorpicker.html
			$('#color-picker').empty().addColorPicker({
				clickCallback: function(c) {
					$("#selected-color").css('color',c);
					// $("#selected-color").animate({
					// 	color: "#fff"
					// },1000);
					VBoard.interface.colorSelected = vb.interface.strRGB2ArrayRGB(c);
					VBoard.interface.colorLastSelectedStr = c;

					// console.log(VBoard.interface.colorSelected + " <--- test");
				},
				colors: [ '#00ffcc','#FF4351', '#7D79F2', '#1B9AF7', '#A5DE37', '#FEAE1B' , '#ff9999'],
				iterationCallback: function(target,elem,color,iterationNumber) {
		      			// if( iterationNumber < 4 /* colors array is undefined here :( */ ) {
		      				target.append('&nbsp;&nbsp;');
		      			// }
		      		elem.css("border","1px solid #dddddd")
		      			.css("padding", "7px")
		      			.css("border-radius", "10px");
					elem.html("&nbsp;&nbsp;&nbsp;&nbsp;");
				}
			});
		},

		// request methods

		userNamePrompt: function (additionalCallBackFunction) {
			vb.interface.switchToUserNicknameModal();
			$('#template-modal').modal('show');
			$('#template-modal #submit-btn-modal-template').unbind();
			$('#template-modal #submit-btn-modal-template').on("click",function () {

				if (VBoard.interface.colorSelected[1] != 0 && VBoard.interface.colorSelected[2] != 0 && VBoard.interface.colorSelected[3] != 0) {
					if ($('#user-nickname').val() != '') {
						vb.interface.setUserName($('#user-nickname').val(),VBoard.interface.colorSelected);
						$('#template-modal').modal('hide');
						vb.interface.clearTemplateModal();
						if (additionalCallBackFunction) setTimeout(additionalCallBackFunction,500);
					} else {
						// alert('Please enter a valid username');
						vb.interface.setTemplateModalAlert('Make sure you put in a valid nickname')
					}
				} else {
					vb.interface.setTemplateModalAlert('Make sure you select a color')
				}
			});
			//TODO: figure out a proper callback

			vb.interface.setInputFocusAndEnterKeyCallback("#user-nickname","#submit-btn-modal-template",false);
		},

		
		joinLobbyRequest: function (lobbyNo, lobbyName) {
			if (VBoard.interface.userName != "") {
				vb.interface.switchToJoinLobbyModal(lobbyName);
				$('#template-modal').modal('show');
				$('#template-modal #submit-btn-modal-template').unbind();
				$('#template-modal #submit-btn-modal-template').on("click",function () {
					var password = $('#lobby-password').val();

					//black should be a valid color, this needs changing   <--- let's first fix the color selections to the five preset colors
					// if (VBoard.interface.colorSelected[1] != 0 && VBoard.interface.colorSelected[2] != 0 && VBoard.interface.colorSelected[3] != 0) {
						vb.interface.showLoading();
						vb.limboIO.joinGame(VBoard.interface.userName,VBoard.interface.colorSelected,lobbyNo,password);

					// } else {
					// 	vb.interface.setTemplateModalAlert('Please select a color');
					// }
				});
			} else {
				this.userNamePrompt();
				this.setTemplateModalAlert('Please choose a nickname first');
			}
		},



		createLobbyRequest: function () {
			if (VBoard.interface.userName != "") {
				vb.interface.switchToCreateLobbyModal();
				$('#template-modal').modal('show');
				$('#template-modal #submit-btn-modal-template').unbind();
				$('#template-modal #submit-btn-modal-template').on("click",function () {
					// var gameName = $('lobby#-name').val();
					var gameName = VBoard.interface.userName + "'s Game";
					var password = $('#lobby-password').val();

					// if (gameName != '' && VBoard.interface.colorSelected[1] != 0 && VBoard.interface.colorSelected[2] != 0 && VBoard.interface.colorSelected[3] != 0) {
						// console.log(VBoard.interface.colorSelected + ' <-- test');
						vb.interface.showLoading();
						vb.limboIO.hostGame(VBoard.interface.userName,VBoard.interface.colorSelected,gameName,password);	
						// console.log(VBoard.interface.userName+ VBoard.interface.colorSelected + gameName + password);

					// } else {
					// 	vb.interface.setTemplateModalAlert('Please enter a select a color');
					// }
					// $('#template-modal').modal('hide');
				});
			} else {
				this.userNamePrompt(vb.interface.createLobbyRequest);
				this.setTemplateModalAlert('Please choose a nickname/color first');
			}
		},

		showLoading: function () {
			$("#loading-notification").show("fast");
		},

		hideLoading: function (instant) {
			if(instant) {
				$("#loading-notification").hide();
			} else {
				$("#loading-notification").hide("fast");
			}
		},

		listLobbiesRequest: function () {
			vb.limboIO.listGames();
		},

		leaveLobbyRequest: function () {
			vb.sessionIO.disconnect("disconnected through interface requests");
		},

		// returned msg methods
		showListGames: function (listOfGames) {
			vb.interface.hideLoading(true);
			// console.log("list all games");
			// console.log(JSON.stringify(listOfGames));
			if (listOfGames.length != 0) {
				$("#lobby-list").empty();
				var func = new Array(listOfGames.length);

				for (var j = listOfGames.length - 1; j >= 0; j--) {
					var lobbyID = listOfGames[j]["id"];
					var lobbyName = listOfGames[j]["name"];
					var singleLobby = '<a id="lobby-' + listOfGames[j]["id"].toString() + '" class="list-group-item"><span class="badge badge-default pull-right">' + listOfGames[j]["players"] + ' ' + ((listOfGames[j]["players"]==1)?'player':'players')+ ' online</span><h2>' + listOfGames[j]["name"] + '</h2></a>'
					$("#lobby-list").append(singleLobby);
					var currentLobby = $("#lobby-" + listOfGames[j]["id"].toString());
					currentLobby.unbind();

					// this line fixes
					func[j] = (function(a,b){currentLobby.on("click",function() {vb.interface.joinLobbyRequest(a,b);});})(lobbyID,lobbyName);

					// currentLobby.on("click",function() {vb.interface.joinLobbyRequest(lobbyID,lobbyName);});

				}
			} else {
				$("#lobby-list").empty();
				$("#lobby-list").append('<a id="retry-btn" class="list-group-item">No Games Found, but you can Create a Lobby!</a>');
				$('#retry-btn').unbind();
				// $('#retry-btn').on('click',function() {vb.interface.listLobbiesRequest();})
			}
		},

		// Modal operation functions
		switchToGameMode: function () {
			$("#loading-notification-text").text("Success...");

			$("#main-page").hide("slow", function () {
				$("#game-page").show(); //("display", "block");
				vb.interface.hideLoading();
				//$("#game-page").css("display", "block");
			});
			$('#template-modal').modal('hide');
			vb.interface.clearTemplateModal();
			vb.interface.clearTemplateModalAlert();
			VBoard.interface.colorSelected = [0,0,0];
			$('#resume-game').hide();

			// stop lobby list refreshing
			clearInterval(VBoard.interface.autoGameListIntervalID);

			// enable chat
			vb.interface.chatInit();
		},

		switchToCreateLobbyModal: function () {
			vb.interface.clearTemplateModalAlert();
			vb.interface.clearTemplateModal();
			$('#modal-template-title').html('Create A Lobby');
			$('#modal-template-content').html('<div class="form-group">\
									<label for="lobby-password" class="form-control-label">Optional Passw**d:</label> \
									<input type="password" class="form-control" id="lobby-password" placeholder="Password">\
								</div>');
			$('#random-gamename').unbind().on('click',function(){$('#lobby-name').val(generate_game_name());});
			$('#template-modal #submit-btn-modal-template').show().html('Create');
			// $("#selected-color").css('color',this.colorLastSelectedStr);
			// vb.interface.colorPickerInit();
		},

		switchToJoinLobbyModal: function (lobbyName) {
			vb.interface.clearTemplateModalAlert();
			vb.interface.clearTemplateModal();
			$('#modal-template-title').html('Join 『' + lobbyName + '』');
			$('#modal-template-content').html('<div class="form-group">\
									<label for="lobby-password" class="form-control-label">Game Password:</label>\
									<input type="password" class="form-control" id="lobby-password">\
								</div>');
			$('#template-modal #submit-btn-modal-template').show().html('Join');
			// $("#selected-color").css('color',this.colorLastSelectedStr);
			// vb.interface.colorPickerInit();
		},

		switchToResumeGameModal: function (lobbyName) {
			vb.interface.clearTemplateModalAlert();
			vb.interface.clearTemplateModal();
			$('#modal-template-title').html('Resume 『' + lobbyName + '』');

			$('#modal-template-content').html('<div class="form-group">\
									<label for="lobby-password" class="form-control-label">Re-enter Game Password:</label>\
									<input type="password" class="form-control" id="lobby-password">\
								</div>');

			$('#template-modal #submit-btn-modal-template').show().html('Re-Join');
		},

		switchToUserNicknameModal: function () {
			vb.interface.clearTemplateModalAlert();
			vb.interface.clearTemplateModal();
			$('#modal-template-title').html('Pick a Nickname:');

			$('#modal-template-content').html('<div class="form-group"> \
									<label for="color-picker" class="form-control-label">Choose an Avatar <span id="selected-color">Color</span>:</label> \
									<div id="color-picker" style="padding-top: 5px;"></div>\
								</div>\
										<div class="input-group">\
										<input type="text" class="form-control" placeholder="Your nickname..." id="user-nickname">\
										<span class="input-group-btn">\
										<button class="btn btn-default" type="button" id="random-nickname"><span class="glyphicon glyphicon-refresh" aria-hidden="true"></span></button>\
										</span>\
										</div>');

			$('#random-nickname').unbind().on('click',function(){$('#user-nickname').val(generate_game_name());});
			$('#template-modal #submit-btn-modal-template').show().html('Confirm');
			$("#selected-color").css('color',this.colorLastSelectedStr);
			vb.interface.colorPickerInit();
		},

		clearTemplateModal: function () {
			$('#modal-template-title').html("");
			$('#modal-template-content').html('');
		},

		//the first character appears as an error for me, can we just stick to ascii please
		setTemplateModalAlert: function (alertText) {
			this.hideLoading();
			$("#model-template-alert").html('<div class="alert alert-danger" role="alert">\
									<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span> '+ alertText + '\
								</div>');
		},

		clearTemplateModalAlert: function () {
			$("#model-template-alert").html('');
		},

		alertModal: function (alertText, automaticRefresh) {
			this.hideLoading();

			function sleep(milliseconds) {
				var start = new Date().getTime();
				for (var i = 0; i < 1e7; i++) {
					if ((new Date().getTime() - start) > milliseconds){
						break;
					}
				}
			};
			vb.interface.clearTemplateModal();
			$('#submit-btn-modal-template').hide();
			$('#modal-template-title').html("Opps!");
			$('#template-modal').modal('show');
			if (!automaticRefresh) {
				vb.interface.setTemplateModalAlert(alertText);
			} else {
				var count = 10;
				vb.interface.setTemplateModalAlert(alertText + ' (Reload in <span id="count-down">'+ count + '</span> seconds)');

				setInterval(function(){
				      $("#count-down").html((--count).toString());
				      if(count == 0) location.reload();
				   }, 1000);
			}
		},

		chatInit: function () {
			$("#send-chat").on("click", function () {
				var msg = $("#chatbox-msg").val();
				if (msg != "") {
					vb.sessionIO.sendChatMessage(VBoard.interface.userName + "#1ax}#" + VBoard.interface.colorLastSelectedStr + "#1ax}#" + msg);
					// clear out the input box
					$("#chatbox-msg").val("");
				} else {
					// $("#chatbox-msg").val('<span style="color:red;">Please enter your message</span>');
				}
			});
			$("#chatbox-msg").on("focus",function () {
				if (!($("#chatbox-inbox").is(":visible"))) $("#chatbox-inbox").fadeIn("fast");
			});
			$("#chatbox").on("mouseenter",function () {
				if (!($("#chatbox-inbox").is(":visible"))) $("#chatbox-inbox").fadeIn("fast");
			});
			// $("#chatbox-inbox").on("mouseenter",function () {
			// 	if (!($("#chatbox-inbox").is(":visible"))) $("#chatbox-inbox").fadeIn("fast");
			// });
			$("#chatbox").on("mouseleave",function () {
				$("#chatbox-inbox").fadeOut("slow");
			});
			// $("#chatbox-inbox").on("mouseleave",function () {
			// 	$("#chatbox-inbox").fadeOut("slow");
			// });

			vb.interface.setInputFocusAndEnterKeyCallback("#chatbox-msg","#send-chat",true);
		},

		chatIncomingMsg: function (msg,needDecoding) {
			if (!($("#chatbox-inbox").is(":visible"))) {
				$("#chatbox-inbox").fadeIn("fast");
				setTimeout(function () {$("#chatbox-inbox").fadeOut("slow");},8000);
			}
			if (needDecoding) {
				// first decode the message
				var msgDecoded = msg.split("#1ax}#");
				if (msgDecoded.length == 3) {
					var username =  (msgDecoded[0] == VBoard.interface.userName)? vb.interface.abbrLongStr(msgDecoded[0],10)+"(me)": vb.interface.abbrLongStr(msgDecoded[0],10);
					var color = msgDecoded[1];
					// animate new message
					var tempHTML = '<p id="new-msg" style="display: none;"><span style="color:'+color+';">'+username+' : </span><span class="chat_message">'+msgDecoded[2]+'</span></p>';
					$("#chatbox-inbox").prepend(tempHTML);
					$("#new-msg").slideToggle("fast").attr("id","processed");
				}
			} else {
				$("#chatbox-inbox").prepend('<p><span style="color: #000099;" class="chat_message_system"><strong>'+msg+'</strong></span></p>');
			}

		},

		// handler for refresh friend list
		showPlayerList: function (data) {
			console.log(JSON.stringify(data));
			$("#players-list-list").empty();
			
			for (var i = data.length - 1; i >= 0; i--) {
				console.log(JSON.stringify(data[i]));
				var str = '<p style="color: '+ vb.interface.arrayRGB2StrRGB(data[i]['color'])+';">' + data[i]['name'] + ((data[i]['host'])?"(host)":"") + '</p>';
				$("#players-list-list").append(str);
			}
		},
		// helper function
		setUserName: function (username,optionalColor) {
			VBoard.interface.userName = username;
			
			if (optionalColor) {
				$('#change-username').html('<i class="fa fa-user" style="color: ' + vb.interface.arrayRGB2StrRGB(optionalColor) +'"></i> ' + VBoard.interface.userName);
				// set color to the border
				$("#change-username").css("border","1px solid "+ vb.interface.arrayRGB2StrRGB(optionalColor));
				$("#change-username").hover(function() {
					$(this).css("box-shadow", "0 0 10px "+ vb.interface.arrayRGB2StrRGB(optionalColor));
				}, function () {
					$(this).css("box-shadow", "none");
				});
			} else {
				$('#change-username').html('<i class="fa fa-user"></i> ' + VBoard.interface.userName);
			}
		},
		getRandomName: function () {
			var nameList = ['Hippo','Fox','Frog','Cat','Sloth','Bunny','Pikachu','Ant','Snake','Dog','Meow','Rat','ET'];

			var randomNum = Math.floor((Math.random() * nameList.length));
			return nameList[randomNum];
		},
		checkLobbyExist: function () {

		},
		strRGB2ArrayRGB: function (str) {
			var retRGB = str.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
			return [parseInt(retRGB[1],10),parseInt(retRGB[2],10),parseInt(retRGB[3],10)];
		},
		arrayRGB2StrRGB: function (array) {
			return 'rgb(' + array.toString() + ')';
		},
		setInputFocusAndEnterKeyCallback: function (textbox,enterKey,skipFocus) {
			if (!skipFocus) {
				setTimeout(function () {
					$(textbox).focus();
				}, 500);
			}

			$(textbox).keypress(function (event) {
				//detect enter keypress while textbox is selected
				if(event.keyCode == '13') {
					$(enterKey).click();
				}
			});
		},
		abbrLongStr: function (originalStr, toLength) {
			return originalStr.substring(0,Math.min(toLength,originalStr.length)) + ((originalStr.length > toLength)?"...":"");
		}
	};
})(VBoard);
