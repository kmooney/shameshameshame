$(function() {
    $.get('/status', function(status) { 
        $(".settings-link").show();
    });
});
