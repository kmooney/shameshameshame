$(function() {
    $.get('/status', function(status) { 
        if(!!status.screen_name) {
            $(".settings-link").show();
        }
    });
});
