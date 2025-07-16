import { Server as IOServer, Socket } from 'socket.io';
import { prepareDataForWebhook, postDataToSourceForBet } from '../../utilities/common-function';
import { addSettleBet, insertBets } from './bets-db';
import { appConfig } from '../../utilities/app-config';
import { setCache, getCache } from '../../utilities/redis-connection';
import { logEventAndEmitResponse, getPayoutMultiplier, getDetailsFromWinningNumber } from '../../utilities/helper-function';
import { createLogger } from '../../utilities/logger';
import { sendToQueue } from '../../utilities/amqp';
import { CurrentLobbyData, PlayerDetail, SingleBetObject } from '../../interfaces';

const logger = createLogger('Bets', 'jsonl');
const settlBetLogger = createLogger('Settlement', 'jsonl');
const failedBetsLogger = createLogger('userFailedBets', 'plain');
const creditQueueLogger = createLogger('CreditQueue', 'jsonl');
const erroredLogger = createLogger('ErrorData', 'plain');


const lobbies: Record<string | number, CurrentLobbyData> = {};
const lobbiesBets: Record<string | number, SingleBetObject[]> = {};

export const setCurrentLobby = (roomId: number, data: CurrentLobbyData): void => {
    lobbies[roomId] = data;
};

const getTimer = (roomId: number): number => {
    if (roomId === 101) return 55;
    if (roomId === 102) return 175;
    if (roomId === 103) return 295;
    return 0;
};

export const placeBet = async (socket: Socket, betData: any[]) => {
    try {
        const playerDetailsStr = await getCache(`PL:${socket.id}`);
        if (!playerDetailsStr) {
            return socket.emit('message', { eventName: 'betError', data: { message: 'Invalid Player Details', status: false } });
        }

        const parsedPlayerDetails: PlayerDetail = JSON.parse(playerDetailsStr);
        const { id, userId, operatorId, token, game_id, balance } = parsedPlayerDetails;
        const [lobbyId, roomIdStr, betAmountRaw, chip] = betData;
        const roomId = Number(roomIdStr);
        const betAmount = Number(betAmountRaw);

        const lobbyTimer = lobbyId.split('-')[0];
        const lobbyTime = Number(lobbyTimer.slice(8));
        const bet_id = `BT:${lobbyId}:${roomId}:${userId}:${operatorId}:${betAmount}:${chip}:${Date.now()}`;
        const betObj: SingleBetObject = { id, bet_id, token, socket_id: parsedPlayerDetails.socketId, game_id, betAmount, chip, roomId: roomIdStr };

        const validRooms = [101, 102, 103];
        const currentLobby = lobbies[roomId];

        if (!currentLobby || currentLobby.lobbyId !== lobbyId || currentLobby.status !== 0) {
            return logEventAndEmitResponse(socket, betObj, 'Invalid Lobby Id Passed', 'bet');
        }

        const maxTimer = getTimer(roomId);
        if ((Date.now() - lobbyTime) / 1000 > maxTimer) {
            return logEventAndEmitResponse(socket, betObj, 'Lobby timed out', 'bet');
        }

        if (!validRooms.includes(roomId)) {
            return logEventAndEmitResponse(socket, betObj, 'Invalid Room Id Passed', 'bet');
        }

        if (betAmount < Number(appConfig.minBetAmount) || betAmount > Number(appConfig.maxBetAmount)) {
            return logEventAndEmitResponse(socket, betObj, 'Invalid Bet Amount', 'bet');
        }

        if (betAmount > Number(balance)) {
            return logEventAndEmitResponse(socket, betObj, 'Insufficient Balance', 'bet');
        }

        const webhookData = await prepareDataForWebhook({ lobby_id: lobbyId, betAmount, game_id, bet_id, user_id: userId }, "DEBIT", socket);
        if (!webhookData) return socket.emit('betError', 'Something went wrong!');
        betObj.txn_id = webhookData.txn_id;

        try {
            await postDataToSourceForBet({ webhookData, token, socketId: socket.id });
        } catch (err) {
            failedBetsLogger.error(JSON.stringify({ req: bet_id, res: 'bets cancelled by upstream' }));
            return logEventAndEmitResponse(socket, betObj, 'Bet cancelled by upstream', 'bet');
        }

        if (!lobbiesBets[roomId]) lobbiesBets[roomId] = [];
        lobbiesBets[roomId].push(betObj);
        logger.info(JSON.stringify(betObj));

        await insertBets(bet_id);

        parsedPlayerDetails.balance = Number(Number(balance) - betAmount).toFixed(2);
        await setCache(`PL:${socket.id}`, JSON.stringify(parsedPlayerDetails));
        socket.emit('message', { eventName: "info", data: { user_id: userId, operator_id: operatorId, balance: parsedPlayerDetails.balance } });
        socket.emit('message', { eventName: "bet", data: { message: "Bet Placed successfully" } });
    } catch (err) {
        console.error(err);
        erroredLogger.error(betData, 'Bet cannot be placed', err);
        socket.emit('message', { eventName: 'betError', data: { message: 'Bet cannot be placed' } });
    }
};


export const settleBet = async (io: IOServer, result: string[], lobbyId: string): Promise<void> => {
    try {
        const roomId = lobbyId.split('-')[1];
        if (!lobbiesBets[roomId]) return;

        const bets = lobbiesBets[roomId];
        const settlements: SingleBetObject[] = [];
        const uniqueUsers = new Set<string>();
        const result = getDetailsFromWinningNumber(winningNumber);

        for (const betData of bets) {
            const { betAmount, chip, id } = betData;
            const winMultiplier = getPayoutMultiplier(chip, winningNumber);
            const winningAmount = Number(betAmount * 0.98) * winMultiplier;

            uniqueUsers.add(id);

            settlBetLogger.info(JSON.stringify({ betData, winningAmount, winningNumber, winMultiplier }));

            settlements.push({
                ...betData,
                winning_number: winningNumber,
                max_mult: winMultiplier > 0 ? winMultiplier.toFixed(2) : '0.00',
                winAmount: winMultiplier > 0 ? (winningAmount).toFixed(2) : '0.00'
            });
        }

        const userWiseBets: SingleBetObject[][] = [];
        uniqueUsers.forEach(userId => {
            userWiseBets.push(settlements.filter(bet => bet.id === userId));
        });

        await Promise.all(userWiseBets.map(async (bets) => {
            const { socket_id, txn_id, game_id, bet_id, token } = bets[0];
            const [, lobby_id, roomIdStr, user_id, operator_id] = bet_id.split(':');
            const finalWinAmount = (Math.min(bets.reduce((a, b) => a + Number(b.winAmount), 0), appConfig.maxCashoutAmount)).toFixed(2);

            const socket = io.sockets.sockets.get(socket_id) || null;

            if (Number(finalWinAmount) > 0) {
                const webhookData = await prepareDataForWebhook({ user_id, final_amount: finalWinAmount, lobby_id, game_id, txnId: txn_id }, 'CREDIT', socket);
                creditQueueLogger.info(JSON.stringify({ ...webhookData, operatorId: operator_id, token }));
                await sendToQueue('', 'games_cashout', JSON.stringify({ ...webhookData, operatorId: operator_id, token }));

                const cachedPlayerDetails = await getCache(`PL:${socket_id}`);
                if (cachedPlayerDetails) {
                    const parsedPlayerDetails: PlayerDetail = JSON.parse(cachedPlayerDetails);
                    parsedPlayerDetails.balance = (Number(parsedPlayerDetails.balance) + Number(finalWinAmount)).toFixed(2);
                    await setCache(`PL:${socket_id}`, JSON.stringify(parsedPlayerDetails));
                    setTimeout(() => {
                        io.to(socket_id).emit('message', { eventName: "info", data: { user_id, operator_id, balance: parsedPlayerDetails.balance } });
                    }, 3000);
                }

                io.to(socket_id).emit('message', {
                    eventName: 'settlement',
                    data: {
                        message: `You won ${finalWinAmount}`,
                        mywinningAmount: finalWinAmount,
                        status: 'WIN',
                        result,
                        roomId,
                        lobby_id
                    }
                });
            } else {
                const lossAmount = bets.reduce((a, b) => a + Number(b.betAmount), 0).toFixed(2);
                io.to(socket_id).emit('message', {
                    eventName: 'settlement',
                    data: {
                        message: `You loss ${lossAmount}`,
                        lossAmount,
                        status: 'LOSS',
                        result,
                        roomId,
                        lobby_id
                    }
                });
            }
        }));

        await addSettleBet(settlements);
        delete lobbiesBets[roomId];
    } catch (error) {
        console.error('Error settling bets:', error);
    }
};
