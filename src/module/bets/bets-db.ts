import { BetsObject, SettlementData, SingleBetObject } from '../../interfaces';
import { write } from '../../utilities/db-connection';

const SQL_INSERT_BETS =
  'INSERT INTO bets (bet_id, lobby_id, user_id, operator_id, bet_amount, user_bets, room_id) VALUES(?,?,?,?,?,?,?)';

export const addSettleBet = async (settlements: SingleBetObject[]): Promise<void> => {
  try {
    const finalData: (string | number | undefined)[][] = [];

    for (const settlement of settlements) {
      const { bet_id, betAmount, winAmount, result, userBets, roomId, lobby_id, user_id, operatorId } = settlement;

      finalData.push([
        bet_id,
        lobby_id,
        user_id,
        operatorId,
        betAmount,
        JSON.stringify(userBets),
        roomId,
        JSON.stringify(result),
        winAmount
      ]);
    }

    const placeholders = finalData.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
    const SQL_SETTLEMENT = `
      INSERT INTO settlement (
        bet_id,
        lobby_id,
        user_id,
        operator_id,
        bet_amount,
        user_bets,
        room_id,
        result,
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

export const insertBets = async (betObj: BetsObject): Promise<void> => {
  try {
    const { bet_id, totalBetAmt, userBets, roomId, lobby_id, user_id, operatorId } = betObj;

    await write(SQL_INSERT_BETS, [
      bet_id,
      lobby_id,
      user_id,
      operatorId,
      totalBetAmt,
      JSON.stringify(userBets),
      roomId
    ]);

    console.info(`Bet placed successfully for user`, user_id);
  } catch (err) {
    console.error('Error inserting bet:', err);
  }
};
