
import { Server, Socket } from "socket.io";
import { exitRoom, joinRoom, roomStats } from "../module/bets/bets-session";
import { createLogger } from '../utilities/logger';

const logger = createLogger('Event');

export const messageRouter = async (io: Server, socket: Socket): Promise<void> => {
    socket.on('message', (data: string) => {
        logger.info(data);
        const event = data.split(':');
        switch (event[0].toUpperCase()) {
            case 'JN': return joinRoom(io, socket, event[1]);
            case 'EX': return exitRoom(io, socket, event[1]);
            case 'HS': return roomStats(io, socket);
        }
    });
};