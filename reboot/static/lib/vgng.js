
/*
  credits to http://videogamena.me
*/

$.get('/static/lib/video_game_names.txt', function(data) {
    build_list(data);
    $("div#video_game_name0").text("Click below to generate a video game name");
});

// $("div#new_name").live( "click", function(event) {
//     $("div#video_game_name0").text(generate_game_name());
//     $('a#tweet').each(function(){
// 	    $(this).attr('href', ('http://twitter.com/share?url=http://videogamena.me/&text=I made "' + $("div#video_game_name0").text() + '" with the Video Game Name Generator! Make your own: '));
// 	});
//     });

var word_list = new Array(3);

function build_list(big_list) {
  var words = big_list.split(/\r?\n/i);
  window.word_list[0] = []
  var word_list_index = 0;
  for (var word in words) {
    if (words[word] == "----") {
      word_list_index++;
      window.word_list[word_list_index] = []
    } else {
      window.word_list[word_list_index].push(words[word]);
    }
  }
}

function generate_game_name() {
  var first_word = window.word_list[0][Math.floor(Math.random()*window.word_list[0].length)];
  var second_word = "";
  var third_word = "";
  var bad_match_list = new Array();

  var allow_similar_matches = !$('#similar_terms').is(':checked');

  if (first_word.indexOf("^") != -1) {
      if (!allow_similar_matches) {
	  bad_match_list = first_word.split("^")[1].split('|');    
      }
      first_word = first_word.split("^")[0]; 
  } 

  var second_word_bad = true;
  while (second_word_bad) {
    second_word = window.word_list[1][Math.floor(Math.random()*window.word_list[1].length)];
    if (second_word.indexOf("^") != -1) {
	if (!allow_similar_matches) {
	    bad_match_list.concat(second_word.split('^')[1].split('|'));
	}
	second_word = second_word.split('^')[0];                           
    }

    if (second_word == first_word) {
	continue;
    }

    if ($.inArray(second_word, bad_match_list) != -1) {
	continue;
    }
    second_word_bad = false;
  }

  var third_word_bad = true;
  while (third_word_bad) {
    third_word = window.word_list[2][Math.floor(Math.random()*window.word_list[2].length)];

    if (third_word.indexOf("^") != -1) {
	if (!allow_similar_matches) {
	    bad_match_list.concat(third_word.split('^')[1].split('|'));
	}
	third_word = second_word.split('^')[0];                           
    }

    if (third_word == first_word || third_word == second_word) {
	continue;
    }

    if ($.inArray(third_word, bad_match_list) != -1) {
	continue;
    }
    third_word_bad = false;
  }  
  return first_word + " " + second_word + " " + third_word;
}

function addLoadEvent(func) {
  var oldonload = window.onload;
  if(typeof window.onload != 'function') {
    window.onload = func;
  }
  else {
    window.onload = function() {
      if(oldonload) {
        oldonload();
      }
    func();
    }
  }
}