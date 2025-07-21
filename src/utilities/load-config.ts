import { read } from './db-connection';
import { SingleRoomDetail } from './helper-function';

export const variableConfig: {
    games_templates: SingleRoomDetail[] | []
} = {
    games_templates: []
}

export const loadConfig = async () => {
    const data = await read(`SELECT data FROM game_templates WHERE is_active = 1`, []);
    variableConfig.games_templates = data ? data.map(e => JSON.parse(JSON.stringify(e.data))) : [];
    console.log("DB Variables loaded in cache");
};
