import { Socket } from 'socket.io';
import { createLogger } from './logger';
import { BetEvent, BetResult, SingleRoomDetail, WinningDetails } from '../interfaces';
import { bonuses, roomPlayerCount } from '../module/lobbies/lobby-event';
import { variableConfig } from './load-config';
import { read } from './db-connection';
const failedBetLogger = createLogger('failedBets', 'jsonl');
const failedJoinLogger = createLogger('failedJoinRoom', 'jsonl');
const failedExitLogger = createLogger('failedExitRoom', 'jsonl');

export const logEventResponse = (
    req: unknown,
    res: string,
    event: BetEvent
): void => {
    const logData = JSON.stringify({ req, res });
    if (event === 'bet') {
        failedBetLogger.error(logData);
    };
    if (event === 'jnRm') {
        failedJoinLogger.error(logData);
    };
    if (event == 'exRm') {
        failedExitLogger.error(logData);
    };
};

export const eventEmitter = (
    socket: Socket | undefined,
    eventName: string,
    data: any
): void => {
    if (socket) socket.emit('message', { eventName, data });
}

export const getUserIP = (socket: any): string => {
    const forwardedFor = socket.handshake.headers?.['x-forwarded-for'];
    if (forwardedFor) {
        const ip = forwardedFor.split(',')[0].trim();
        if (ip) return ip;
    }
    return socket.handshake.address || '';
};

const mults = {
    clrMult: 2,
    combMult: 5
};

const numCombs: { [key: string]: number } = {
    '1-2': 7,
    '2-3': 8,
    '4-5': 9,
    '5-6': 10,
    '1-4': 11,
    '2-5': 12,
    '3-6': 13,
    '1-3': 14,
    '4-6': 15,
    '3-5': 16,
    '6-2': 17,
    '1-5': 18,
    '4-2': 19,
    '3-4': 20,
    '6-1': 21
};

// export const getBetResult = (btAmt: number, chip: string, result: number[], roomId: number): BetResult => {

//     const resultData: BetResult = {
//         chip,
//         btAmt,
//         winAmt: 0,
//         mult: 0.00,
//         status: 'loss',
//         isBonus: false
//     };

//     const chipData = chip.split('-').map(Number);
//     if (chipData.length == 1) {
//         if (result.includes(chipData[0])) {
//             resultData.mult = mults.clrMult;
//             resultData.status = 'win';
//             resultData.winAmt = resultData.btAmt * resultData.mult;
//             if (bonuses[roomId].includes(chipData[0])) {
//                 resultData.mult *= 2;
//                 resultData.winAmt *= 2;
//                 resultData.isBonus = true;
//             }
//         }
//     };
//     if (chipData.length > 1) {
//         if (result.includes(chipData[0]) && result.includes(chipData[1])) {
//             resultData.mult = mults.combMult;
//             resultData.status = 'win';
//             resultData.winAmt = resultData.btAmt * resultData.mult;
//             if (numCombs[chip] && bonuses[roomId].includes(numCombs[chip])) {
//                 resultData.mult *= 2;
//                 resultData.winAmt *= 2;
//                 resultData.isBonus = true;
//             }
//         }
//     }
//     return resultData;
// };

export const getBetResult = (btAmt: number, chip: string, result: number[], roomId: number): BetResult => {
    const chipNumbers = chip.split('-').map(Number);
    const isSingle = chipNumbers.length === 1;

    let mult = 0;
    let status: BetResult["status"] = 'loss';
    let isBonus = false;

    const isWinning =
        (isSingle && result.includes(chipNumbers[0])) ||
        (!isSingle && result.includes(chipNumbers[0]) && result.includes(chipNumbers[1]));

    if (isWinning) {
        mult = isSingle ? mults.clrMult : mults.combMult;
        status = 'win';

        const bonusNum = isSingle ? chipNumbers[0] : numCombs[chip];
        if (bonuses[roomId].includes(bonusNum)) {
            mult *= 2;
            isBonus = true;
        }
    }

    const winAmt = btAmt * mult;

    return {
        chip,
        btAmt,
        winAmt,
        mult,
        status,
        isBonus
    };
};

const roomDetails: SingleRoomDetail[] = [
    {
        roomId: 101,
        chips: [50, 100, 200, 300, 500, 750],
        min: 50,
        max: 500,
        clrMax: 500,
        clrMin: 50,
        cmbMax: 200,
        cmbMin: 50,
        plCnt: 0
    },
    {
        roomId: 102,
        chips: [100, 200, 300, 500, 750, 1250],
        min: 100,
        max: 1250,
        clrMax: 1250,
        clrMin: 100,
        cmbMax: 500,
        cmbMin: 100,
        plCnt: 0
    },
    {
        roomId: 103,
        chips: [500, 750, 1000, 2000, 3000, 5000],
        min: 500,
        max: 5000,
        clrMax: 5000,
        clrMin: 500,
        cmbMax: 2000,
        cmbMin: 500,
        plCnt: 0
    },
    {
        roomId: 104,
        chips: [1000, 2000, 3000, 5000, 7500, 10000],
        min: 1000,
        max: 12500,
        clrMax: 12500,
        clrMin: 1000,
        cmbMax: 5000,
        cmbMin: 1000,
        plCnt: 0
    }
];

export const getRooms = () => {
    const roomData = variableConfig.games_templates && variableConfig.games_templates.length > 0 ? variableConfig.games_templates : roomDetails;
    roomData.map(room => {
        room['plCnt'] = roomPlayerCount[room.roomId];
        return room;
    });
    return roomData;
};

export const historyStats = async () => {
    try {
        const historyData = await read(`SELECT room_id, result FROM lobbies ORDER BY created_at DESC LIMIT 400`);
        const filteredData: { [key: number]: number[][] } = {};
        historyData.map(e => {
            const { room_id, result } = e;
            if (!filteredData[room_id]) filteredData[room_id] = [JSON.parse(result)];
            else filteredData[room_id].push(JSON.parse(result));
        });
        return filteredData;
    } catch (err) {
        console.error('Error fetching history is:::', err);
        return false
    }
}

export function getNumberPercentages(data: number[][]) {
    const count: { [key: number]: number } = {
        1: 0, 2: 0, 3: 0,
        4: 0, 5: 0, 6: 0
    };

    let total = 0;

    for (const row of data) {
        for (const num of row) {
            if (num >= 1 && num <= 6) {
                count[num]++;
                total++;
            }
        }
    }

    const percentages: { [key: number]: number } = {};
    for (let i = 1; i <= 6; i++) {
        percentages[i] = total > 0 ? (count[i] / total) * 100 : 0;
    }

    return percentages;
}