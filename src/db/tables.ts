export const lobbies = `CREATE TABLE IF NOT EXISTS lobbies (
   id int primary key  auto_increment,
   lobby_id varchar(255) NOT NULL,
   room_id INT NOT NULL,
   start_delay INT NOT NULL,
   end_delay INT NOT NULL,
   result INT NOT NULL DEFAULT 0,
   created_at datetime DEFAULT CURRENT_TIMESTAMP
 );`

export const bets = `CREATE TABLE IF NOT EXISTS bets (
   id int primary key  auto_increment,
   bet_id varchar(255) NOT NULL,
   lobby_id varchar(255) NOT NULL,
   user_id varchar(255) NOT NULL,
   operator_id varchar(255) DEFAULT NULL,
   bet_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
   chip INT DEFAULT NULL,
   room_id INT NOT NULL,
   created_at datetime DEFAULT CURRENT_TIMESTAMP
 );`


export const settlement = `CREATE TABLE IF NOT EXISTS settlement (
   settlement_id int primary key AUTO_INCREMENT,
   bet_id varchar(255) NOT NULL,
   lobby_id varchar(255) NOT NULL,
   user_id varchar(255) NOT NULL,
   operator_id varchar(255) DEFAULT NULL,
   bet_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
   chip INT DEFAULT NULL,
   room_id INT NOT NULL,
   winning_number INT NOT NULL,
   max_mult DECIMAL(10, 2) DEFAULT 0.00,
   win_amount decimal(10, 2) DEFAULT 0.00,
   created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP
 );`