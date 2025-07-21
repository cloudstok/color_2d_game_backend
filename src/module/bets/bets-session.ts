import { Server as IOServer, Socket } from 'socket.io';
import { updateBalanceFromAccount } from '../../utilities/common-function';
import { addSettleBet, insertBets } from './bets-db';
import { roomPlayerCount } from '../lobbies/lobby-event';
import { appConfig } from '../../utilities/app-config';
import { setCache, getCache, deleteCache } from '../../utilities/redis-connection';
import { logEventResponse, getUserIP, getBetResult, eventEmitter, getRooms } from '../../utilities/helper-function';
import { createLogger } from '../../utilities/logger';
import { AccountsResult, BetReqData, BetResult, BetsObject, CurrentLobbyData, FinalUserData, PlayerDetail, SingleBetObject } from '../../interfaces';
const logger = createLogger('Bets', 'jsonl');
const settlBetLogger = createLogger('Settlement', 'jsonl');
const erroredLogger = createLogger('ErrorData', 'plain');
const numberChips = [1, 2, 3, 4, 5, 6];

const lobbies: Record<string | number, CurrentLobbyData> = {};
const lobbiesBets: Record<string | number, BetsObject[]> = {};

export const setCurrentLobby = (roomId: number, data: CurrentLobbyData): void => {
    lobbies[roomId] = data;
};

export const joinRoom = async (socket: Socket, roomId: string) => {
    try {
        const stringifiedPlayerDetails = await getCache(`PL:${socket.id}`);

        if (!stringifiedPlayerDetails) {
            logEventResponse({ roomId }, 'Player details not found', 'jnRm');
            eventEmitter(socket, 'betError', { message: 'Player details not found' });
            return;
        };

        const playerDetails: FinalUserData = JSON.parse(stringifiedPlayerDetails);
        const { user_id, operatorId } = playerDetails;
        const isPlayerExistInRoom = await getCache(`rm-${operatorId}:${user_id}`);

        if (isPlayerExistInRoom) {
            logEventResponse({ roomId, ...playerDetails }, 'Player already exist in another room', 'jnRm');
            eventEmitter(socket, 'betError', { message: 'Player already exist in another room' });
            return;
        };

        roomPlayerCount[Number(roomId)]++;
        socket.join(roomId);
        await setCache(`rm-${operatorId}:${user_id}`, roomId);
        eventEmitter(socket, 'jnRm', { message: 'Room joined successfully', roomId });
        lobbiesBets[Number(roomId)].forEach(e => {
            if (e.user_id == user_id && e.operatorId == operatorId) e.socket_id = socket.id;
        })
        return;
    } catch (err) {
        logEventResponse({ roomId }, 'Something went wrong, unable to join room', 'jnRm');
        eventEmitter(socket, 'betError', { message: 'Something went wrong, unable to join room' });
        socket.disconnect(true);
        return;
    }
};

export const exitRoom = async (socket: Socket, roomId: string) => {
    try {
        const stringifiedPlayerDetails = await getCache(`PL:${socket.id}`);
        if (!stringifiedPlayerDetails) {
            logEventResponse({ roomId }, 'Player details not found', 'exRm');
            eventEmitter(socket, 'betError', { message: 'Player details not found' });
            return;
        };
        const playerDetails: FinalUserData = JSON.parse(stringifiedPlayerDetails);
        const { user_id, operatorId } = playerDetails;
        const isPlayerExistInRoom = await getCache(`rm-${operatorId}:${user_id}`);
        if (!isPlayerExistInRoom) {
            logEventResponse({ roomId, ...playerDetails }, 'Player does not belong to room', 'exRm');
            eventEmitter(socket, 'betError', { message: 'Player does not belong to room' });
            return;
        };
        socket.leave(roomId);
        roomPlayerCount[Number(roomId)]--
        await deleteCache(`rm-${operatorId}:${user_id}`);
        eventEmitter(socket, 'lvRm', { message: 'Room left successfully', roomId });
        return;
    } catch (err) {
        logEventResponse({ roomId }, 'Something went wrong, unable to leave room', 'exRm');
        eventEmitter(socket, 'betError', { message: 'Something went wrong, unable to leave room' });
        socket.disconnect(true);
        return;
    }
};

export const disConnect = async (socket: Socket) => {
    try {
        const stringifiedPlayerDetails = await getCache(`PL:${socket.id}`);
        if (stringifiedPlayerDetails) {
            const playerDetails: FinalUserData = JSON.parse(stringifiedPlayerDetails);
            const { user_id, operatorId } = playerDetails;
            const existingRoom = await getCache(`rm-${operatorId}:${user_id}`);
            if (existingRoom) socket.leave(existingRoom);
            await deleteCache(`PL:${socket.id}`);
            roomPlayerCount[Number(existingRoom)]--;
            socket.disconnect(true);
            return;
        }
    } catch (err) {
        eventEmitter(socket, 'betError', { message: 'Something went wrong, unable to disconnect' });
        return;
    }
};

export const reconnect = async (socket: Socket, playerDetails: FinalUserData) => {
    try {
        eventEmitter(socket, 'rmDtl', { halls: getRooms() });
        const { user_id, operatorId } = playerDetails;
        const existingRoom = await getCache(`rm-${operatorId}:${user_id}`);
        if (existingRoom) {
            lobbiesBets[Number(existingRoom)].forEach(e => {
                if (e.user_id == user_id && e.operatorId == operatorId) e.socket_id = socket.id;
            });
            roomPlayerCount[Number(existingRoom)]++;
            socket.join(existingRoom);
            eventEmitter(socket, 'rn', { message: 'redirected to existing room', roomId: existingRoom });
        };
    } catch (err) {
        eventEmitter(socket, 'betError', { message: 'Something went wrong, unable to connect' });
        socket.disconnect(true);
        return;
    }
}

export const placeBet = async (socket: Socket, betData: BetReqData) => {
    try {
        const playerDetailsStr = await getCache(`PL:${socket.id}`);
        if (!playerDetailsStr) {
            logEventResponse({ betData }, 'Player details not found', 'bet');
            eventEmitter(socket, 'betError', { message: 'Player details not found' });
            return;
        }

        const parsedPlayerDetails: PlayerDetail = JSON.parse(playerDetailsStr);
        const { id, user_id, operatorId, token, game_id, balance } = parsedPlayerDetails;
        const lobby_id = betData.lobbyId;
        const [time, roomId] = lobby_id.split('-').map(Number);

        const currentLobbyData = lobbies[roomId];

        if (!currentLobbyData) {
            logEventResponse({ betData, ...parsedPlayerDetails }, 'Invalid lobby id passed', 'bet');
            eventEmitter(socket, 'betError', { message: 'Invalid lobby id passed' });
            return;
        };

        if (currentLobbyData.lobbyId != lobby_id) {
            logEventResponse({ betData, ...parsedPlayerDetails }, 'Invalid lobby id passed', 'bet');
            eventEmitter(socket, 'betError', { message: 'Invalid lobby id passed' });
            return;
        };

        const timeDiff = (Date.now() - time) / 1000;

        if (timeDiff < 15 || currentLobbyData.status != 1) {
            logEventResponse({ betData, ...parsedPlayerDetails }, 'Lobby timed out', 'bet');
            eventEmitter(socket, 'betError', { message: 'Lobby timed out' });
            return;
        };

        let isBetInvalid: Boolean = false;
        let ttlBtAmt: number = 0;
        const userBets = betData.userBets;
        const bet_id = `BT:${lobby_id}:${user_id}:${operatorId}`;
        const betObj: BetsObject = { id, bet_id, user_id, operatorId, token, socket_id: parsedPlayerDetails.socketId, game_id, roomId, userBets, totalBetAmt: 0, ip: getUserIP(socket) };
        const roomData = getRooms().find(room => room.roomId == roomId);
        if (!roomData) {
            logEventResponse({ betData, ...parsedPlayerDetails }, 'Invalid Room', 'bet');
            eventEmitter(socket, 'betError', { message: 'Invalid Room' });
            return;
        }
        for (const bet of userBets) {
            const { chip, btAmt } = bet;
            ttlBtAmt += btAmt;
            const chips = chip.split('-').map(Number);

            if (chips.length === 1) {
                const singleChip = chips[0];
                if ((!numberChips.includes(singleChip) && (btAmt < roomData.clrMin || btAmt > roomData.clrMax))) {
                    isBetInvalid = true;
                    break;
                };
            }

            if (chips.length > 1) {
                chips.map((e: number) => {
                    if (!numberChips.includes(e)) {
                        isBetInvalid = true;
                    }
                });
                if (btAmt < roomData.cmbMin || btAmt > roomData.cmbMax) {
                    isBetInvalid = true;
                    break;
                }
            }
        };

        if (isBetInvalid) {
            logEventResponse({ betData, ...parsedPlayerDetails }, 'Invalid Bet', 'bet');
            eventEmitter(socket, 'betError', { message: 'Invalid Bet' });
            return;
        };

        if (ttlBtAmt > Number(balance)) {
            logEventResponse({ betData, ...parsedPlayerDetails }, 'Insufficient Balance', 'bet');
            eventEmitter(socket, 'betError', { message: 'Insufficient Balance' });
            return;
        };
        betObj['totalBetAmt'] = ttlBtAmt;

        const webhookData: AccountsResult = await updateBalanceFromAccount({
            id: lobby_id,
            bet_amount: ttlBtAmt,
            game_id,
            ip: betObj.ip,
            user_id
        }, "DEBIT", { game_id, operatorId, token });

        if (!webhookData.status) {
            logEventResponse({ betData, ...parsedPlayerDetails }, 'Bet Cancelled By Upstream Server', 'bet');
            eventEmitter(socket, 'betError', { message: 'Bet Cancelled By Upstream Server' });
            return;
        };
        betObj.txn_id = webhookData.txn_id;

        if (!lobbiesBets[roomId]) lobbiesBets[roomId] = [];
        lobbiesBets[roomId].push(betObj);
        logger.info(JSON.stringify(betObj));

        await insertBets(betObj);

        parsedPlayerDetails.balance = Number(Number(balance) - ttlBtAmt).toFixed(2);
        await setCache(`PL:${socket.id}`, JSON.stringify(parsedPlayerDetails));
        eventEmitter(socket, 'info', { user_id, operator_id: operatorId, balance: parsedPlayerDetails.balance, avtr: parsedPlayerDetails.image });
        eventEmitter(socket, 'bet', { message: "Bet Placed successfully" });
        return;
    } catch (err) {
        erroredLogger.error(betData, 'Bet cannot be placed', err);
        socket.emit('message', { eventName: 'betError', data: { message: 'Bet cannot be placed', status: false } });
        return;
    }
};


export const settleBet = async (io: IOServer, result: number[], roomId: number): Promise<void> => {
    try {
        if (!lobbiesBets[roomId]) return;

        const bets = lobbiesBets[roomId];
        const settlements: SingleBetObject[] = [];

        for (const betData of bets) {
            const { bet_id, socket_id, game_id, txn_id, userBets, ip, token, totalBetAmt } = betData;
            const [_, lobby_id, user_id, operator_id] = bet_id.split(':');
            const socket = io.sockets.sockets.get(socket_id);
            let finalAmount = 0;
            const betResults: BetResult[] = [];
            userBets?.forEach(({ btAmt, chip }) => {
                const roundResult = getBetResult(btAmt, chip, result);
                betResults.push(roundResult);
                if (roundResult.mult > 0) {
                    finalAmount += roundResult.winAmt;
                }
            });

            settlements.push({
                bet_id: betData.bet_id,
                betAmount: totalBetAmt,
                userBets: betResults,
                roomId,
                result,
                winAmount: finalAmount > 0 ? finalAmount : 0.00,
            });

            settlBetLogger.info(JSON.stringify({ betData, finalAmount, result }));

            if (finalAmount > 0) {
                const winAmount = Number(finalAmount).toFixed(2);
                const webhookData = await updateBalanceFromAccount({ user_id, winning_amount: winAmount, id: lobby_id, game_id, txn_id: txn_id, ip }, 'CREDIT', { game_id, operatorId: operator_id, token });
                if (!webhookData.status) console.error('Credit Txn Failed');

                const cachedPlayerDetails = await getCache(`PL:${socket_id}`);
                if (cachedPlayerDetails) {
                    const parsedPlayerDetails = JSON.parse(cachedPlayerDetails);
                    parsedPlayerDetails.balance = Number(Number(parsedPlayerDetails.balance) + finalAmount).toFixed(2);
                    await setCache(`PL:${socket_id}`, JSON.stringify(parsedPlayerDetails));
                    setTimeout(() => {
                        eventEmitter(socket, 'info', {
                            user_id,
                            operator_id,
                            balance: parsedPlayerDetails.balance,
                            avtr: parsedPlayerDetails.image
                        });
                    }, 500);
                };
                eventEmitter(socket, 'settlement', { message: `You Win ${winAmount}`, mywinningAmount: winAmount, status: 'WIN', roundResult: result, betResults, lobby_id });
            } else {
                eventEmitter(socket, 'settlement', { message: `You loss ${totalBetAmt}`, lossAmount: totalBetAmt, status: 'LOSS', roundResult: result, betResults, lobby_id });
            }
        }


        await addSettleBet(settlements);
        delete lobbiesBets[roomId];
    } catch (error) {
        console.error('Error settling bets:', error);
    }
};
