import { Server as IOServer } from 'socket.io';
import { insertLobbies } from './lobbies-db';
import { createLogger } from '../../utilities/logger';
import { LobbyData, LobbyStatusData } from '../../interfaces';
import { setCurrentLobby, settleBet } from '../bets/bets-session';
import { getNumberPercentages, historyStats } from '../../utilities/helper-function';

const logger = createLogger('Color_Game_2D', 'jsonl');

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const roomPlayerCount: { [key: number]: number } = {
    101: 0,
    102: 0,
    103: 0,
    104: 0
};

export const roomWiseHistory: {
    [key: number]: number[][]
} = {
    101: [],
    102: [],
    103: [],
    104: []
};

export const roomColorProbs: { [key: number]: { [key: number]: number } } = {
    101: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    102: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    103: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    104: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
};

export const bonuses: { [key: number]: number[] } = {
    101: [],
    102: [],
    103: [],
    104: []
};

function updateBonus() {
    for (let bonus in bonuses) {
        const bonusCount = Math.floor(Math.random() * 4) + 1;
        while (bonuses[bonus].length < bonusCount) {
            const randomIndex = Math.floor(Math.random() * 21) + 1;
            if (!bonuses[bonus].includes(randomIndex)) bonuses[bonus].push(randomIndex);
        }
    }
};

function resetBonus() {
    for (let bonus in bonuses) {
        bonuses[bonus].length = 0;
    }
}

function updateProbs() {
    for (let room in roomColorProbs) {
        roomColorProbs[room] = getNumberPercentages(roomWiseHistory[room]);
    }
}

async function generateStats() {
    const historyDataFromDB: { [key: string]: number[][] } | false = await historyStats();
    if (!historyDataFromDB) return;
    for (let room in roomWiseHistory) {
        roomWiseHistory[Number(room)] = historyDataFromDB[room];
    };
}

export const initLottery = async (io: IOServer): Promise<void> => {
    logger.info("lobby started");
    await generateStats();
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
    const mid_delay = 6;
    const resultDelay = 10;
    const result: number[] = getResult();
    const end_delay = 5;

    for (let x = start_delay; x > 0; x--) {
        io.to(`${roomId}`).emit('message', { eventName: "color", data: { message: `${lobbyId}:${x}:STARTING` } });
        await sleep(1000);
    }

    recurLobbyData.status = 1;
    setCurrentLobby(roomId, recurLobbyData);
    updateBonus();

    for (let y = 1; y <= mid_delay; y++) {
        io.to(`${roomId}`).emit('message', { eventName: 'color', data: { message: `${lobbyId}:${y}:CALCULATING` } })
        await sleep(1000);
    }

    recurLobbyData.status = 2;
    setCurrentLobby(roomId, recurLobbyData);

    io.to(`${roomId}`).emit('message', { eventName: 'bnDtl', data: bonuses[roomId] });
    await sleep(1000);

    for (let w = 1; w <= resultDelay; w++) {
        io.to(`${roomId}`).emit('message', { eventName: 'color', data: { message: `${lobbyId}:${JSON.stringify(result)}:RESULT:${w}` } });
        await sleep(1000);
    };

    await settleBet(io, result, roomId);

    recurLobbyData.status = 3;
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
    if (roomWiseHistory[roomId].length == 100) {
        roomWiseHistory[roomId].pop();
    }
    roomWiseHistory[roomId].unshift(result);
    updateProbs();
    resetBonus();

    io.to(`${roomId}`).emit('message', { eventName: "history", data: { lobbyId, result, roomId, colorProbs: roomColorProbs[roomId] } });
    logger.info(JSON.stringify(history));
    await insertLobbies(history);
    return initLobby(io, roomId);
};