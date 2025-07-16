import axios, { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import { Socket } from 'socket.io';
import { createLogger } from '../utilities/logger';
import { PostResponse, WebhookBetObject, WebhookData, WebhookPostData } from '../interfaces';

const thirdPartyLogger = createLogger('ThirdPartyAPICalls', 'jsonl');
const failedLogger = createLogger('FailedThirdPartyAPICalls', 'jsonl');

export function generateUUIDv7(): string {
  const timestamp = Date.now();
  const timeHex = timestamp.toString(16).padStart(12, '0');
  const randomBits = crypto.randomBytes(8).toString('hex').slice(2);

  const uuid = [
    timeHex.slice(0, 8),
    timeHex.slice(8) + randomBits.slice(0, 4),
    '7' + randomBits.slice(4, 7),
    (parseInt(randomBits.slice(7, 8), 16) & 0x3f | 0x80).toString(16) + randomBits.slice(8, 12),
    randomBits.slice(12)
  ];

  return uuid.join('-');
}

export const postDataToSourceForBet = async (data: WebhookPostData): Promise<PostResponse> => {
  try {
    return await new Promise((resolve, reject) => {
      const { webhookData, token, socketId } = data;
      const url = process.env.service_base_url;

      const clientServerOptions: AxiosRequestConfig = {
        method: 'POST',
        url: `${url}/service/operator/user/balance/v2`,
        headers: { token },
        data: webhookData,
        timeout: 10000
      };

      axios(clientServerOptions)
        .then((result: any) => {
          thirdPartyLogger.info(JSON.stringify({ req: data, res: result.data }));
          resolve({ status: result.status, ...webhookData, socketId });
        })
        .catch((err: any) => {
          console.error(`[ERR] received from upstream server`, err);
          const response = err.response?.data || 'Something went wrong';
          failedLogger.error(JSON.stringify({ req: { webhookData, token }, res: response }));
          reject({ ...webhookData, socketId });
        });
    });
  } catch (err) {
    console.error(`[ERR] while posting data to source is:::`, err);
    failedLogger.error(JSON.stringify({ req: data, res: `Something went wrong` }));
    throw err;
  }
};

export const prepareDataForWebhook = async (
  betObj: WebhookBetObject,
  key: 'DEBIT' | 'CREDIT',
  socket: Socket | null
): Promise<WebhookData | false> => {
  try {
    const { lobby_id, betAmount, game_id, bet_id, final_amount, user_id, txnId } = betObj;

    let userIP = socket?.handshake?.address || '';
    const forwardedFor = socket?.handshake.headers['x-forwarded-for'];
    if (forwardedFor) {
      userIP = String(forwardedFor).split(',')[0].trim();
    }

    const obj: WebhookData = {
      amount: Number(betAmount).toFixed(2),
      txn_id: generateUUIDv7(),
      ip: userIP,
      game_id,
      user_id: decodeURIComponent(user_id)
    };

    if (key === 'DEBIT') {
      obj.description = `${obj.amount} debited for Wingo game for Round ${lobby_id}`;
      obj.bet_id = bet_id;
      obj.txn_type = 0;
    } else if (key === 'CREDIT') {
      obj.amount = final_amount;
      obj.txn_ref_id = txnId;
      obj.description = `${final_amount} credited for Wingo game for Round ${lobby_id}`;
      obj.txn_type = 1;
    }

    return obj;
  } catch (err) {
    console.error(`[ERR] while trying to prepare data for webhook is::`, err);
    return false;
  }
};
