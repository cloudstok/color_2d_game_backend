import { Server, Socket } from 'socket.io';
import { getUserDataFromSource } from './module/players/player-event';
import { eventRouter } from './router/event-router';
import { messageRouter } from './router/message-router';
import { setCache, deleteCache } from './utilities/redis-connection';
import { initLottery, roomPlayerCount } from './module/lobbies/lobby-event';
import { reconnect } from './module/bets/bets-session';

export const initSocket = (io: Server): void => {
  initLottery(io);

  io.on('connection', async (socket: Socket) => {

    const { token, game_id } = socket.handshake.query as { token?: string; game_id?: string };

    if (!token || !game_id) {
      socket.disconnect(true);
      console.log('Mandatory params missing', token);
      return;
    }

    const userData = await getUserDataFromSource(token, game_id);

    if (!userData) {
      console.log('Invalid token', token);
      socket.disconnect(true);
      return;
    }

    socket.emit('message', { eventName: 'info', data: { user_id: userData.user_id, operator_id: userData.operatorId, balance: userData.balance } });

    await setCache(`PL:${socket.id}`, JSON.stringify({ ...userData, socketId: socket.id }), 3600);

    messageRouter(socket);
    eventRouter(socket);
    reconnect(socket, userData);

    socket.on('disconnect', async () => {
      await deleteCache(`PL:${socket.id}`);
    });

    socket.on('error', (error: Error) => {
      console.error(`Socket error: ${socket.id}. Error: ${error.message}`);
    });
  });
};