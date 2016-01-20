$(function() {
    var conversation = 7016;
    
    $.get(global.path.messages + "/" + conversation, function(html) {
        var $html = $(html);
        var $serverMain = $html.find(".main");
        var $serverMessages = $serverMain.find(".messages");
        var $serverForm = $serverMain.find("form.new_message");
        var serverFormSerialized = $serverForm.serializeArray();
        
        // Invalid conversation page
        if (!$serverMessages.length) {
            console.error("There was a problem parsing the conversation page!");
        }
        
        else {
            var $other = $serverMain.find(".pagination").prev("h2").find("a");
            var otherLink = $other.attr("href");
            var $discussion = $(".discussion");
            
            console.info("Loading conversation with %o...", $other.text());
            
            var messages = parseMessages($serverMessages);
            
            // Iterate messages
            $.each(messages, function(i, v) {
                var $message = _factory(".factory", ".modation-message");
                
                // Set up message
                $message.find(".avatar img").attr("src", v.img);
                $message.find(".modation-messages > p").text(v.body);
                $message.find(".name").text(v.user);
                $message.find(".age").text(v.age);
                $message.addClass(v.link == otherLink ? "other" : "self");
                
                $discussion.append($message);
            });
            
            console.info("Loaded! %o", messages);
            
            // Submit form w/ textarea: http://stackoverflow.com/a/13103227/3402854
        }
    });
});

function parseMessages(messages) {
    var $messages = $(messages);
    var parsedMessages = [];
    
    // Invalid message container
    if (!$messages.is(".messages")) {
        console.error("Invalid message container!");
    }
    
    else {
        // Iterate messages
        $messages.find(".message").each(function(i, v) {
            var $message = $(this);
            var $img = $message.find("img").first();
            var $content = $message.find(".content");
            var $user = $content.find("h4").first();
            var $age = $content.find(".age");
            var $body = $content.find(".body");
            
            parsedMessages.push({
                img: $img.attr("src"),
                user: $user.text(),
                link: $user.find("a").attr("href"),
                age: $age.text(),
                body: $body.html()
            });
        });
    }
    
    return parsedMessages;
}