$(function() {
    $.get('/status', function(status) { 
        if(!!status.screen_name) {
            $(".settings-link").show();
        }
    });

    $.get("/hot_qs", function(hottest_questions) { 
        _.each(hottest_questions, function(q) { 
            $(".questions").append($("<li>"+q+"</li>")); 
       })
   });
});
