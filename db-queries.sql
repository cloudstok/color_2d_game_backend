ALTER TABLE `bets` ADD INDEX `inx_bet_id` (`bet_id` ASC) INVISIBLE, ADD INDEX `inx_lobby_id` (`lobby_id` ASC) INVISIBLE, ADD INDEX `inx_user_id` (`user_id` ASC) INVISIBLE, ADD INDEX `inx_operator_id` (`operator_id` ASC) VISIBLE, ADD INDEX `inx_bet_amount` (`bet_amount` ASC) INVISIBLE, ADD INDEX `inx_chip` (`chip` ASC) INVISIBLE, ADD INDEX `inx_room_id` (`room_id` ASC) VISIBLE, ADD INDEX `inx_created_at` (`created_at` ASC) VISIBLE;
ALTER TABLE `settlement` ADD INDEX `inx_bet_id` (`bet_id` ASC) VISIBLE, ADD INDEX `inx_lobby_id` (`lobby_id` ASC) VISIBLE, ADD INDEX `inx_user_id` (`user_id` ASC) INVISIBLE, ADD INDEX `inx_operator_id` (`operator_id` ASC) VISIBLE, ADD INDEX `inx_bet_amount` (`bet_amount` ASC) INVISIBLE, ADD INDEX `inx_chip` (`chip` ASC) INVISIBLE, ADD INDEX `inx_room_id` (`room_id` ASC) INVISIBLE, ADD INDEX `inx_max_mult` (`max_mult` ASC) INVISIBLE, ADD INDEX `inx_win_amount` (`win_amount` ASC) INVISIBLE, ADD INDEX `inx_created_at` (`created_at` ASC) VISIBLE;
ALTER TABLE `lobbies` ADD INDEX `inx_lobby_id` (`lobby_id` ASC) INVISIBLE, ADD INDEX `inx_created_at` (`created_at` ASC) VISIBLE;
CREATE INDEX inx_room_id ON lobbies (room_id);

INSERT INTO game_templates (data) VALUES 
('{"roomId":101,"chips":[50,100,200,300,500,750],"min":50,"max":500,"clrMax":500,"clrMin":50,"cmbMax":200,"cmbMin":50,"plCnt":0}'),
('{"roomId":102,"chips":[100,200,300,500,750,1250],"min":100,"max":1250,"clrMax":1250,"clrMin":100,"cmbMax":500,"cmbMin":100,"plCnt":0}'),
('{"roomId":103,"chips":[500,750,1000,2000,3000,5000],"min":500,"max":5000,"clrMax":5000,"clrMin":500,"cmbMax":2000,"cmbMin":500,"plCnt":0}'),
('{"roomId":104,"chips":[1000,2000,3000,5000,7500,10000],"min":1000,"max":12500,"clrMax":12500,"clrMin":1000,"cmbMax":5000,"cmbMin":1000,"plCnt":0}');
