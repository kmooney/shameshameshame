// main.js

var express = require('express'),
    prefix = "@"+process.env.GARBAGE_PERSON,
    some_responses = [
      prefix + " you should be ashamed of yourself!",
      prefix + " TAX RETURNS PLEASE!",
      prefix + " you are an embarrassment to the American people!",
      prefix + " Why don't you tell us if you were involved with the DNC hack?",
      prefix + " Why are you giving comfort to America's adversaries?",
      prefix + " How much money do you owe alfabank?",
      prefix + " How much money do you owe the russians?"
    ],
    app = express(),
    listener = app.listen(process.env.PORT, function () {
      console.log('Your app is listening on port ' + listener.address().port);
    }),
    cookieSession = require('cookie-session'),
    assert = require('assert'),
    twitterAPI = require('node-twitter-api'),
    mysql = require('mysql'),
    database = mysql.createConnection({
      host:     process.env.MYSQL_HOST,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      user:     process.env.MYSQL_USER
    }),
    twitter = twitterAPI({
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callback: "https://"+process.env.DOMAIN+"/okay/",
      x_auth_access_type: "write",
    }),
    _ = require('lodash'),
    saveTokenResponse = function(accessToken, accessTokenSecret, username) {
      database.query(
        "INSERT INTO users (screen_name, access_token, access_token_secret) VALUES (?, ?, ?) \
        ON DUPLICATE KEY UPDATE access_token = ?, access_token_secret = ?",
        [username, accessToken, accessTokenSecret, accessToken, accessTokenSecret],
        function(err, results) {
          if (err) {
            console.log("Mysql error: ", err);
          } else {
            console.log("Okay, stashed");
          }
        }
      );
    },
    shouldRespond = function(tweetId, userId, success) {
      console.log("Should ", userId, "respond to", tweetId,"?")
      database.query("SELECT tweet_id FROM responses WHERE tweet_id = ? AND user_id = ?", [tweetId, userId], function(e, r) {
        if (e) {
          console.log(e);
          return
        }
        
        if (!r || r.length === 0 || r[0].tweet_id !== tweetId) {
          console.log("yep");
          respondToTweet(tweetId, userId, success);
        } else {
          console.log("narp");
        }
      })
    },
    respondToTweet = function(tweetId, userId, success) {
      database.query("INSERT INTO responses (tweet_id, user_id) VALUES (?, ?)", [tweetId, userId], function(e, r) {
        if (e) {
          console.log(e);
          return;
        }
        database.query("SELECT access_token, access_token_secret FROM users WHERE id = ?", [userId], function(e, r) {
          if (e) {
            console.log(e);
            return;
          }
          if (r.length === 0) {
            console.log("No tokens for user", userId, "wtf");
          }

          var accessToken = r[0].access_token,
              accessTokenSecret = r[0].access_token_secret;

          console.log("Trying to tweet: ", accessToken, accessTokenSecret, r);
          twitter.statuses("update",
            {
              status: _.sample(some_responses),
              in_reply_to_status_id: tweetId
            },
            accessToken,
            accessTokenSecret,
            function(e, d, r) {
              if (e) {
                console.log(e);
              } else {
                success(d, r);
              }
            }
          )
        });
      });
    },
    getUser = function(username, cb) {
        database.query("SELECT screen_name, active FROM users WHERE screen_name = ?", [username], function(error, results) { 
            if (error) { 
                console.log(error);
                return;
            }
            cb(results[0]);
        });
    }
    go = function() {
        var handleListResponse = function(error, data, r) {
            if (error) {
                console.log(error);
                return;
            }
            database.query("SELECT id AS user_id FROM users WHERE active IS NOT NULL", [], function(error, users) {
                    console.log('users', users);
		    if (error) {
			console.log(error);
			return;
		    }
		    _.each(users, function(user) {
			    data = _.filter(data, function(t) {
				return t.user.screen_name == process.env.GARBAGE_PERSON && !t.in_reply_to_status_id // && t.source.indexOf("android") !== -1;
			    });

			    _.each(data, function(t) {
				console.log("Checking should respond for:", t.id_str);
				shouldRespond(t.id_str, user.user_id, function(d, r) {
				    console.log("done! from twittar:", d, r);
				});
			    });
		     });
            });
      };

      database.query(
      	"SELECT access_token, access_token_secret FROM users WHERE screen_name = ?",
	[process.env.OUR_USER],
        function(err, results) {
            if (err) {
                console.log(err);
                return;
            } 
            var accessToken = results[0].access_token,
                accessTokenSecret = results[0].access_token_secret;
            data = twitter.getTimeline("user",
	        {"screen_name": process.env.GARBAGE_PERSON},
	        accessToken,
	        accessTokenSecret,
	        handleListResponse
            );
        });
    };

database.connect();

app.use(cookieSession({
  name: 'session',
  keys: [process.env.COOKIE_SECRET],
 
  // Cookie Options 
  maxAge: 24 * 60 * 60 * 1000 // 24 hours 
}));
app.post("/switch", function(request, response) {
    if (!request.session.screen_name) {
        response.status(400).json({error: "Scram"});
        return;
    }
    getUser(request.session.screen_name, function(user) {
        database.query(
             "UPDATE users SET active = ? WHERE screen_name = ?",
            [!!user.active ? null : 1, user.screen_name],
            function(err, results) {
                if (err) { 
                   response.status(500).json({error: "Something broke"});
                }
                user.active = !user.active
                response.status(200).json(user);
            }
        );
    });
     
});
app.get("/status", function(request, response) {
    if (!request.session.screen_name) {
        response.status(200).json({error: "Scram"});
        return;
    }
    getUser(request.session.screen_name, function(user) {
        response.json(user);
    });
});

app.get("/okay", function(request, response) {
  var requestToken              = null,
      requestTokenSecret        = null,
      oauthToken                = null,
      oauthVerifier             = null,
      handleAccessTokenResponse = function(error, accessToken, accessTokenSecret, results) {
        if (error) {
          console.log("Error", error);
          response.send(error.code, error);
        } else {
          console.log("Success getting access token", accessToken, results);
          request.session.accessToken = accessToken;
          request.session.accessTokenSecret = accessTokenSecret;
          request.session.screen_name = results.screen_name;
          saveTokenResponse(accessToken, accessTokenSecret, results.screen_name);
          response.redirect('/settings');
        }
      };

  if (request.query.oauth_token) {

    oauthVerifier      = request.query.oauth_verifier;
    oauthToken         = request.query.oauth_token;
    requestToken       = request.session.requestToken;
    requestTokenSecret = request.session.requestTokenSecret;

    assert.equal(
      requestToken,
      oauthToken,
      (
        "Well, the requestToken from before really should " +
        "be the same as the oauthToken from now."
      )
    );
    
    twitter.getAccessToken(
      oauthToken,
      requestTokenSecret,
      oauthVerifier,
      handleAccessTokenResponse
    );
  } else {
    console.log("Not oauth token, request query is ", request.query);
    response.status(500).send("ERROR")
  }

});

app.get("/login", function(request, response) {
  twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results) {
    if (error) {
      console.log("There was an error", error);
    } else {
      console.log("Success", requestToken, requestTokenSecret);
      request.session.requestToken = requestToken
      request.session.requestTokenSecret = requestTokenSecret;
      response.redirect(twitter.getAuthUrl(requestToken)); 
    }
  });
});

setInterval(function() {
  console.log('Waking...');
  go();
}, 5000)
