import { LobbyInsertData } from '../../interfaces';
import { write } from '../../utilities/db-connection';

const SQL_INSERT_LOBBIES = 'INSERT INTO lobbies (lobby_id, room_id, start_delay, end_delay, result) VALUES (?, ?, ?, ?, ?)';


export const insertLobbies = async (data: LobbyInsertData): Promise<void> => {
    try {
        const { time, ...rest } = data;
        const values: (string | number | number[])[] = Object.values(rest);
        await write(SQL_INSERT_LOBBIES, values);
    } catch (err) {
        console.error(err);
    }
};
