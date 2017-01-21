// main.js

var express = require('express'),
    prefix = "@"+process.env.GARBAGE_PERSON,
    some_responses = [
        "How much money do you owe alfabank?",
        "How much money do you owe the Russians?  Can you release your tax returns so the american people can see?",
        "You said you know things others don't about hacking. What did you know and when did you know it?",
        "You now claim Russian hacking had no influence on the election. If true, why bring up stolen emails on campaign trail?",
        "Why'd the FBI take out FISA warrants to monitor unusual comms. w/ Russian officials on the part of your campaign staff?",
        "Are you aware if members of your staff were being monitored by the FBI w/r/t unusual comms. with Russian officials?",
        "Can you comment on allegations that you or your staff recvd intel re HRC and primary oppos from RIS during campaign?",
        "Did anyone from your campaign meet with Russian officials in August 2016?",
        "Can you comment on Michael Flynn's 5 calls to Sergey Kislyak on same day the US ejected Russian officials??",
        "When Michael Flynn called Russian ambassador Kislyak 5 times on Dec. 29th, what did they talk about?",
        "Did your campaign make an agreement with Russian gov't to downplay intervention in Ukraine in exchange for their support?",
        "If you sign ACA repeal, what's your plan to replace it?  Do you have a plan?",
        "Did your campaign make a deal w/ Russian gov't to lift sactions if you win?  If yes, what form did their support take?",
        "Why would you chair 'vaccine safety panel' w/ prominent anti-vaxxer RFK Jr.?"
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
      database.query("SELECT tweet_id FROM responses WHERE tweet_id = ? AND user_id = ?", [tweetId, userId], function(e, r) {
        if (e) {
          console.log(e);
          return
        }
        
        if (!r || r.length === 0 || r[0].tweet_id !== tweetId) {
          console.log("yep");
          respondToTweet(tweetId, userId, success);
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
              status: prefix + " " + _.sample(some_responses),
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
        database.query("SELECT screen_name, active, droid_detector FROM users WHERE screen_name = ?", [username], function(error, results) { 
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
            database.query("SELECT id AS user_id, droid_detector FROM users WHERE active IS NOT NULL", [], function(error, users) {
                    console.log('users', users);
		    if (error) {
			console.log(error);
			return;
		    }
		    _.each(users, function(user) {
			    var dds = _.filter(data, function(t) {
                                if (user.droid_detector) {
				    return t.user.screen_name == process.env.GARBAGE_PERSON && !t.in_reply_to_status_id && t.source.indexOf("android") !== -1;
                                } else { 
				    return t.user.screen_name == process.env.GARBAGE_PERSON && !t.in_reply_to_status_id;
                                }
			    });

			    _.each(dds, function(t) {
				shouldRespond(t.id_str, user.user_id, function(d, r) {
				    console.log("done! from twitter:", d, r);
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
app.post("/switch-droid-detect", function(request, response) {
    if (!request.session.screen_name) {
        response.status(400).json({error: "Scram"});
        return;
    }
    getUser(request.session.screen_name, function(user) {
        database.query(
             "UPDATE users SET droid_detector = ? WHERE screen_name = ?",
            [!!user.droid_detector ? null : 1, user.screen_name],
            function(err, results) {
                if (err) { 
                   response.status(500).json({error: "Something broke"});
                }
                user.droid_detector = !user.droid_detector
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

app.get("/hot_qs", function(request, response) {
    response.status(200).json(some_responses);
})

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

    if (requestToken != oauthToken) {
        response.redirect('/login');
        return;
    }
    
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
}, 10000)
