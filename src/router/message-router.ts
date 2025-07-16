
import { Server, Socket } from "socket.io";
import { placeBet } from "../module/bets/bets-session";
import { createLogger } from '../utilities/logger';

const logger = createLogger('Event');

export const messageRouter = async (io: Server, socket: Socket): Promise<void> => {
    socket.on('message', (data: string) => {
        logger.info(data);
        const event = data.split(':');
        if (event[0] == 'PB') return placeBet(socket, event.slice(1, event.length));
    });
};