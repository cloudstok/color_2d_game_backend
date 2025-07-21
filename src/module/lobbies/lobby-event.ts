import { Server as IOServer } from 'socket.io';
import { insertLobbies } from './lobbies-db';
import { createLogger } from '../../utilities/logger';
import { LobbyData, LobbyStatusData } from '../../interfaces';
import { setCurrentLobby, settleBet } from '../bets/bets-session';

const logger = createLogger('Color_Game_2D', 'jsonl');

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const roomPlayerCount: { [key: number]: number } = {
    101: 0,
    102: 0,
    103: 0,
    104: 0
};


export const initLottery = async (io: IOServer): Promise<void> => {
    logger.info("lobby started");
    const delays: number[] = [101, 102, 103, 104];
    delays.forEach((roomId: number) => {
        roomPlayerCount[roomId] = Math.floor(Math.random() * 31) + 30;
        initLobby(io, roomId);
    });
};

const getResult = (): number[] => {
    const resultData: number[] = [];
    while (resultData.length < 3) {
        resultData.push(Math.floor(Math.random() * 6) + 1);
    };
    return resultData;
}

const initLobby = async (io: IOServer, roomId: number): Promise<void> => {

    const lobbyId: string = `${Date.now()}-${roomId}`;
    let recurLobbyData: LobbyStatusData = { lobbyId, status: 0 };

    setCurrentLobby(roomId, recurLobbyData);
    let start_delay = 15;
    const result: number[] = getResult();
    const end_delay = 6;

    for (let x = start_delay; x > 0; x--) {
        io.to(`${roomId}`).emit('message', { eventName: "color", data: { message: `${lobbyId}:${x}:STARTING` } });
        await sleep(1000);
    }

    recurLobbyData.status = 1;
    setCurrentLobby(roomId, recurLobbyData);
    io.to(`${roomId}`).emit('message', { eventName: 'color', data: { message: `${lobbyId}:${JSON.stringify(result)}:RESULT` } });

    await settleBet(io, result, roomId);

    recurLobbyData.status = 2;
    setCurrentLobby(roomId, recurLobbyData);
    for (let z = 1; z <= end_delay; z++) {
        io.to(`${roomId}`).emit('message', { eventName: "color", data: { message: `${lobbyId}:${z}:ENDED` } });
        await sleep(1000);
    }

    const history: LobbyData = {
        time: new Date(),
        lobbyId,
        roomId,
        start_delay,
        end_delay,
        result
    };

    io.to(`${roomId}`).emit('message', { eventName: "history", data: { message: JSON.stringify({ roomId: history.roomId, result }) } });
    logger.info(JSON.stringify(history));
    // await insertLobbies(history);

    return initLobby(io, roomId);
};