$(function() {
    var showSettings = function(status) {
         $(".name").text("@"+status.screen_name); 
         if (!!status.active) {
           $(".mode").text("on");
           $(".mode").addClass("on");
           $(".mode").removeClass("off");
           $(".next-mode").text("off");
           $(".next-mode").addClass("off");
           $(".next-mode").removeClass("on");
           $(".special-hero-shit").fadeIn();
         } else { 
           $(".mode").text("off");
           $(".mode").addClass("off");
           $(".mode").removeClass("on");
           $(".next-mode").text("on");
           $(".next-mode").addClass("on");
           $(".next-mode").removeClass("off");
           $(".special-hero-shit").fadeOut();
         }
    };
    $.get('/status', showSettings);
    $(".toggler").click(function(status) { 
        $.post("/switch", showSettings); 
        return false;
    });
});
