
import { Server, Socket } from "socket.io";
import { exitRoom, joinRoom, placeBet } from "../module/bets/bets-session";
import { createLogger } from '../utilities/logger';

const logger = createLogger('Event');

export const messageRouter = async (socket: Socket): Promise<void> => {
    socket.on('message', (data: string) => {
        logger.info(data);
        const event = data.split(':');
        switch (event[0].toUpperCase()) {
            case 'JN': return joinRoom(socket, event[1]);
            case 'EX': return exitRoom(socket, event[1]);
        }
    });
};