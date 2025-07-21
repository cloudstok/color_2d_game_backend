export interface SettlementData {
    id: string;
    bet_id: string;
    token: string;
    socket_id: string;
    game_id: string;
    betAmount: number;
    chip: string;
    roomId: string;
    txn_id?: string;
    winning_number?: number;
    max_mult?: string | number;
    winAmount?: string | number;
};

export interface LobbyData {
    lobbyId: string;
    roomId: number;
    start_delay: number;
    end_delay: number;
    result: number[];
    time?: Date;
};

export interface RawUserData {
    user_id: string;
    operatorId: string;
    balance: number;
    [key: string]: any;
};

export interface FinalUserData extends RawUserData {
    user_id: string;
    id: string;
    game_id: string;
    token: string;
    image: number;
};

export interface WebhookBetObject {
    lobby_id: string;
    betAmount?: number;
    game_id: string;
    bet_id?: string;
    final_amount?: number | string;
    user_id: string;
    txn_id?: string;
    txnId?: string;
}


export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
    time: number;
    level: LogLevel;
    name: string;
    msg: string;
};

interface DBConfig {
    host: string;
    user: string;
    password: string;
    database: string;
    port: string;
    retries: string;
    interval: string;
};

interface RedisConfig {
    host: string;
    port: number;
    retry: number;
    interval: number;
};

export interface AppConfig {
    minBetAmount: number;
    maxBetAmount: number;
    maxCashoutAmount: number;
    dbConfig: DBConfig;
    redis: RedisConfig;
};

export type WebhookKey = 'CREDIT' | 'DEBIT';
export type BetEvent = 'bet' | 'jnRm' | 'exRm';

export interface WebhookData {
    amount?: string | number | undefined;
    txn_id?: string;
    ip?: string;
    game_id: string;
    user_id: string;
    description?: string;
    bet_id?: string;
    txn_type?: number;
    txn_ref_id?: string;
};


export interface LobbyStatusData {
    lobbyId: string;
    status: number;
}

export interface LobbyInsertData {
    lobbyId: string;
    roomId: number;
    start_delay: number;
    end_delay: number;
    result: string[];
    time?: Date;
};

export interface SingleBetObject {
    bet_id: string;
    betAmount: number;
    userBets: BetResult[];
    result: number[];
    roomId: number;
    max_mult?: number;
    winAmount?: string | number;
};

export interface PlayerDetail {
    id: string;
    user_id: string;
    operatorId: string;
    token: string;
    game_id: string;
    balance: number | string;
    socketId: string;
    image: number;
};

export interface PlayerDetails {
    game_id: string;
    operatorId: string;
    token: string
};

export interface CurrentLobbyData {
    lobbyId: string;
    status: number;
};

export interface WebhookPostData {
    webhookData: WebhookData;
    token: string;
    socketId: string;
};

export interface PostResponse {
    status: number;
    socketId: string;
    [key: string]: any;
};

export interface WinningDetails {
    color: string;
    winningNumber: number;
}

export interface ReqData {
    chip: string;
    btAmt: number;
};

export interface BetReqData {
    lobbyId: string;
    userBets: ReqData[]
};

export type BetResult = {
    chip: string;
    btAmt: number;
    winAmt: number;
    mult: number;
    status: 'win' | 'loss';
};

export interface UsersBet {
    chip: string;
    btAmt: number;
};

export interface BetsObject {
    id: string;
    bet_id: string;
    token: string;
    socket_id: string;
    game_id: string;
    roomId: number;
    ip?: string;
    userBets: UsersBet[];
    resultData?: BetResult[],
    totalBetAmt: number;
    txn_id?: string;
    result?: string;
    status?: 'win' | 'loss';
    win_amount?: number;
};


export interface BetsData {
    id: string;
    bet_amount?: number | string;
    winning_amount?: number | string;
    game_id: string;
    user_id: string;
    bet_id?: string;
    txn_id?: string;
    ip?: string;
};

export interface AccountsResult {
    txn_id?: string;
    status: boolean;
    type: WebhookKey
};