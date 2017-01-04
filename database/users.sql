CREATE TABLE `users` (
  id INT(10) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  screen_name VARCHAR(64) NOT NULL,
  access_token VARCHAR(64) NOT NULL,
  access_token_secret VARCHAR(64) NOT NULL,
  UNIQUE KEY(screen_name)
);

CREATE TABLE `responses` (
  user_id INT(10) NOT NULL,
  tweet_id VARCHAR(64),
  PRIMARY KEY (user_id, tweet_id)
);