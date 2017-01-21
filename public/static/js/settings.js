$(function() {
    var showSetting = function(setting_name, variable) {
         var current = $("." + setting_name + "-mode"),
             next = $("." + setting_name + "-next-mode");
         if (!!variable) { 
             current.text("on");
             current.addClass("on");
             current.removeClass("off");
             next.text("off");
             next.addClass("off");
             next.removeClass("on");
         } else {
             current.text("off");
             current.addClass("off");
             current.removeClass("on");
             next.text("on");
             next.addClass("on");
             next.removeClass("off");
         }
    },
    showSettings = function(status) {
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
         showSetting('droid-detect', status.droid_detector);
    };

    $.get('/status', showSettings);

    $(".toggler").click(function(status) { 
        $.post("/switch", showSettings); 
        return false;
    });

    $(".droid-detector-toggle").click(function() { 
        $.post("/switch-droid-detect", showSettings); 
        return false;
    });
});
