import { Server } from 'socket.io';
import { initLottery } from '../module/lobbies/lobby-event';

export const eventRouter = async (io: Server): Promise<void> => {
  initLottery(io);
};