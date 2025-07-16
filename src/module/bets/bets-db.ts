import { SettlementData } from '../../interfaces';
import { write } from '../../utilities/db-connection';

const SQL_INSERT_BETS =
  'INSERT INTO bets (bet_id, lobby_id, user_id, operator_id, bet_amount, chip, room_id) VALUES(?,?,?,?,?,?,?)';

const SQL_INSERT_STATS =
  'INSERT INTO round_stats (lobby_id, winning_number, total_win_count, total_bet_amount, total_cashout_amount) VALUES(?,?,?,?,?)';

export const addSettleBet = async (settlements: SettlementData[]): Promise<void> => {
  try {
    const finalData: (string | number | undefined)[][] = [];

    for (const settlement of settlements) {
      const { bet_id, max_mult, winAmount, winning_number } = settlement;

      const [initial, lobby_id, roomId, user_id, operator_id, bet_amount, chip, identifier] =
        bet_id.split(':');

      finalData.push([
        bet_id,
        lobby_id,
        decodeURIComponent(user_id),
        operator_id,
        bet_amount,
        chip,
        Number(roomId),
        winning_number,
        max_mult,
        winAmount,
      ]);
    }

    const placeholders = finalData.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
    const SQL_SETTLEMENT = `
      INSERT INTO settlement (
        bet_id,
        lobby_id,
        user_id,
        operator_id,
        bet_amount,
        chip,
        room_id,
        winning_number,
        max_mult,
        win_amount
      ) VALUES ${placeholders}
    `;

    const flattenedData = finalData.flat();

    await write(SQL_SETTLEMENT, flattenedData);
    console.info('Settlement Data Inserted Successfully');
  } catch (err) {
    console.error('Error inserting settlement data:', err);
  }
};

export const insertBets = async (bet_id: string): Promise<void> => {
  try {
    const [initial, lobby_id, roomId, user_id, operator_id, bet_amount, chip, identifier] =
      bet_id.split(':');

    await write(SQL_INSERT_BETS, [
      bet_id,
      lobby_id,
      decodeURIComponent(user_id),
      operator_id,
      bet_amount,
      chip,
      Number(roomId),
    ]);

    console.info(`Bet placed successfully for user`, user_id);
  } catch (err) {
    console.error('Error inserting bet:', err);
  }
};
