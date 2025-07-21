import { Server, Socket } from 'socket.io';
import { BetReqData } from '../interfaces';
import { placeBet } from '../module/bets/bets-session';

export const eventRouter = async (socket: Socket): Promise<void> => {
  socket.on('bet', async (data: BetReqData) => await placeBet(socket, data));
};