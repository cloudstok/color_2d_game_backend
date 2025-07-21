import { Socket } from 'socket.io';
import { createLogger } from './logger';
import { BetEvent, BetResult, WinningDetails } from '../interfaces';
import { roomPlayerCount } from '../module/lobbies/lobby-event';
import { variableConfig } from './load-config';
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
}

export const getBetResult = (btAmt: number, chip: string, result: number[]): BetResult => {

    const resultData: BetResult = {
        chip,
        btAmt,
        winAmt: 0,
        mult: 0.00,
        status: 'loss'
    };

    const chipData = chip.split('-').map(Number);
    if (chipData.length == 1) {
        if (result.includes(chipData[0])) {
            resultData.mult = mults.clrMult;
            resultData.status = 'win';
            resultData.winAmt = resultData.btAmt * resultData.mult;
        }
    };
    if (chipData.length > 1) {
        if (result.includes(chipData[0]) && result.includes(chipData[1])) {
            resultData.mult = mults.combMult;
            resultData.status = 'win';
            resultData.winAmt = resultData.btAmt * resultData.mult;
        }
    }
    return resultData;
};

export interface SingleRoomDetail {
    roomId: number;
    chips: number[];
    min: number;
    max: number;
    clrMax: number;
    clrMin: number;
    cmbMax: number;
    cmbMin: number;
    plCnt: number;
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