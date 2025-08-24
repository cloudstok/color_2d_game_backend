import { Server, Socket } from 'socket.io';
import { createLogger } from './logger';
import { BetEvent, BetResult, SingleBetObject, SingleRoomDetail, TopWinner } from '../interfaces';
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

//1- Yelow, 2- White, 3- Pink, 4- Blue, 5- Red, 6- Green
const numCombs: { [key: string]: number } = {
    '1-2': 7,
    '2-3': 8,
    '1-4': 9,
    '2-5': 10,
    '3-6': 11,
    '4-5': 12,
    '5-6': 13,
    '1-3': 14,
    '1-5': 15,
    '4-6': 16,
    '4-2': 17,
    '3-5': 18,
    '3-4': 19,
    '6-2': 20,
    '6-1': 21
};

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

        if (isSingle) {
            const colorExistence = result.filter(num => num == chipNumbers[0]).length;
            mult += (colorExistence - 1);
        }

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
        const filteredData: { [key: number]: string[][] } = {};
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

export function getNumberPercentages(data: string[][]) {
    const count: { [key: number]: number } = {
        1: 0, 2: 0, 3: 0,
        4: 0, 5: 0, 6: 0
    };

    let total = 0;
    const resData = data.map(e => e.map(el => Number(el.split(':')[0])));

    for (const row of resData) {
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

export let biggestWinners: TopWinner[] = [{
    userId: 'd***0',
    winAmt: 0.00
},
{
    userId: 'e***0',
    winAmt: 0.00
},
{
    userId: 't***0',
    winAmt: 0.00
}
];

export let highestWinners: TopWinner[] = [{
    userId: 'f***0',
    mult: 0.00,
    winAmt: 0.00
},
{
    userId: 'g***0',
    mult: 0.00,
    winAmt: 0.00
},
{
    userId: 'h***0',
    mult: 0.00,
    winAmt: 0.00
}
];

export function updateWinners(results: SingleBetObject[]) {
    const highWins: TopWinner[] = [];
    const bigWins: TopWinner[] = [];

    results.forEach(e => {
        if (e.winAmount) {
            const winAmt = Number(e.winAmount);
            const mult = e.userBets.reduce((a, b) => a + Number(b.mult), 0);

            highWins.push({ userId: e.user_id, mult, winAmt });
            bigWins.push({ userId: e.user_id, winAmt });
        }
    });

    const sortedHighWin = [...highWins]
        .sort((a, b) => (b.mult ?? 0) - (a.mult ?? 0))
        .slice(0, 3);

    const sortedBigWin = [...bigWins]
        .sort((a, b) => Number(b.winAmt) - Number(a.winAmt))
        .slice(0, 3);

    highestWinners = updateUniversalWinners(highestWinners, sortedHighWin, 'mult');
    biggestWinners = updateUniversalWinners(biggestWinners, sortedBigWin, 'winAmt');
};

function updateUniversalWinners(universalWinners: TopWinner[], newRoundWinners: TopWinner[], key: string) {
    const merged = [...universalWinners, ...newRoundWinners];

    const uniqueMap = new Map();
    for (const winner of merged) {
        if (!uniqueMap.has(winner.userId) || uniqueMap.get(winner.userId)[key] < winner[key]) {
            uniqueMap.set(winner.userId, winner);
        }
    }

    const sorted = Array.from(uniqueMap.values()).sort((a, b) => b[key] - a[key]);

    return sorted.slice(0, 3);
};

export function emitWinnersStats(io: Server) {
    io.emit('message', {
        eventName: 'wnSts', data: {
            highWns: highestWinners.map(e => {
                const highWinsObj = { userId: `${e.userId[0]}***${e.userId.slice(-1)}`, winAmt: e.winAmt };
                return highWinsObj
            }),
            bgWns: biggestWinners.map(e => {
                const bigWinsObj = { userId: `${e.userId[0]}***${e.userId.slice(-1)}`, winAmt: e.winAmt };
                return bigWinsObj;
            })
        }
    });
}