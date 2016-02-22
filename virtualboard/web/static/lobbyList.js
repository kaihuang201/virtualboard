var lobbyList = lobbyList || {};
(function(){
	lobbyList.init = function() {
		/*
			Initialize click events
		*/
		lobbyList.openModalOnClick();
		lobbyList.submitForm();
		lobbyList.clearErrorActions();
	};

	lobbyList.openModalOnClick = function() {
		/*
			Click events on lobby links to open approprate modal forms
		*/
		$(".joinable-lobby").on("click", function(){
			var is_protected = $(this).data("isprotected");
			var lobby_id = $(this).data("lobbyid");
			if (is_protected == "True") {
				$("#passcode_join_lobby_id").val(lobby_id);
				$("#passcodeConfirmJoinModal").modal();
			} else {
				$("#join_lobby_id").val(lobby_id);
				$("#confirmJoinModalTitle").text("Join Lobby");
				$("#submit_join_lobby").text("Join");
				$("#confirmJoinModal").modal();
			}
		});
		$("#current-lobby").on("click", function() {
			var lobby_id = $(this).data("lobbyid");
			$("#join_lobby_id").val(lobby_id);
			$("#confirmJoinModalTitle").text("Go To Lobby");
			$("#submit_join_lobby").text("Go");
			$("#confirmJoinModal").modal();
		});
	};

	lobbyList.submitForm = function() {
		/*
			Event handlers for join lobby form submissions. Redirects to lobby page on success, displays error otherwise
		*/
		$("#passcode-join-lobby-form").on("submit", function(event){
			event.preventDefault();
			var lobby_id = $("#passcode_join_lobby_id").val();
			if (lobby_id.length == 0) {
				console.log("Error: lobby_id was not set correctly");
				displayErrors(["Sorry, something went wrong. We can't add you to this lobby."])
				return;
			}
			var url_path = "/" + lobby_id + "/join/";
			var passcode = $("#passcode").val();
			if (passcode.length == 0) {
				errors = []
				errors.push("Please enter a passcode");
				lobbyList.displayErrors(errors);
			}
			var csrftoken = lobbyList.getCookie('csrftoken');
			$.ajax({
				url : url_path,
				type : "POST",
				data : {
					"passcode" : passcode,
				},
				beforeSend: function(xhr) {
					if (!this.crossDomain) {
						xhr.setRequestHeader("X-CSRFToken", csrftoken);
					}
				},
			}).done(function(response) {
				if (response["status"] == "success") {
					window.location.href = response["url"];
				} else if (response["status"] == "error") {
					lobbyList.displayErrors([response["message"]]);
				}
			});
		});

		$("#submit_join_lobby").on("click", function(){
			var lobby_id = $("#join_lobby_id").val();
			if (lobby_id.length == 0) {
				console.log("Error: lobby_id was not set correctly");
				lobbyList.displayErrors(["Sorry, something went wrong. We can't add you to this lobby."])
				return;
			}
			var url_path = "/" + lobby_id  +"/join/";
			var csrftoken = lobbyList.getCookie('csrftoken');
			$.ajax({
				url : url_path,
				type : "POST",
				beforeSend: function(xhr) {
					if (!this.crossDomain) {
						xhr.setRequestHeader("X-CSRFToken", csrftoken);
					}
				},
			}).done(function(response) {
				if (response["status"] == "success") {
					window.location.href = response["url"];
				} else if (response["status"] == "error") {
					lobbyList.displayErrors([response["message"]]);
				}
			});
		});
	};

	lobbyList.displayErrors = function(errors) {
		var htmlErrorList = "<ul>";
		for (i in errors) {
			htmlErrorList += "<li>";
			htmlErrorList += errors[i];
			htmlErrorList += "</li>";
		}
		htmlErrorList += "</ul>";
		$(".join-lobby-errors").html(htmlErrorList);
	};

	lobbyList.clearErrorActions = function() {
		$(".close-modal").on("click", function() {
			$(".join-lobby-errors").empty();
		});
	}

	lobbyList.getCookie = function(name) {
	    var cookieValue = null;
	    if (document.cookie && document.cookie != '') {
	        var cookies = document.cookie.split(';');
	        for (var i = 0; i < cookies.length; i++) {
	            var cookie = jQuery.trim(cookies[i]);
	            // Does this cookie string begin with the name we want?
	            if (cookie.substring(0, name.length + 1) == (name + '=')) {
	                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
	                break;
	            }
	        }
	    }
	    return cookieValue;
	};

})();
$(document).ready(function() {
	lobbyList.init();
});