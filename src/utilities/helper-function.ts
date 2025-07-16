import { Socket } from 'socket.io';
import { createLogger } from './logger';
import { BetEvent, WinningDetails } from '../interfaces';
const failedBetLogger = createLogger('failedBets', 'jsonl');

export const logEventAndEmitResponse = (
    socket: Socket,
    req: unknown,
    res: string,
    event: BetEvent
): void => {
    const logData = JSON.stringify({ req, res });
    if (event === 'bet') {
        failedBetLogger.error(logData);
    }

    socket.emit('message', {
        eventName: 'betError',
        data: { message: res, status: false }
    });
};


export const colorMap: Record<number, string> = {
    0: 'rd-vl',
    1: 'gr',
    2: 'rd',
    3: 'gr',
    4: 'rd',
    5: 'gr-vl',
    6: 'rd',
    7: 'gr',
    8: 'rd',
    9: 'gr'
};

export const colorChips: Record<number, string> = {
    10: 'gr',
    11: 'vl',
    12: 'rd'
};


const MULTIPLIERS = {
    numberMatch: 9.0,
    colorMatch: 2.0,
    violetMatch: 4.5,
    bonusMatch: 1.5
};

export const getPayoutMultiplier = (chip: string | number, winningNumber: string | number): number => {
    const chipNum = Number(chip);
    const winningNum = Number(winningNumber);

    if (chipNum === winningNum) return MULTIPLIERS.numberMatch;

    const chipColor = colorChips[chipNum];
    const winningColor = colorMap[winningNum];
    if (!chipColor || !winningColor) return 0;

    if (winningColor === chipColor) return MULTIPLIERS.colorMatch;

    if (winningColor.split('-').includes(chipColor)) {
        return chipColor === 'vl' ? MULTIPLIERS.violetMatch : MULTIPLIERS.bonusMatch;
    }

    return 0;
};


export const getDetailsFromWinningNumber = (num: number): WinningDetails => {
    const rawColor = colorMap[num];

    let color: string;
    switch (rawColor) {
        case 'gr':
            color = 'Green';
            break;
        case 'rd':
            color = 'Red';
            break;
        case 'rd-vl':
            color = 'Red-Violet';
            break;
        case 'gr-vl':
            color = 'Green-Violet';
            break;
        default:
            color = '';
    }

    return {
        color,
        winningNumber: num
    };
};
