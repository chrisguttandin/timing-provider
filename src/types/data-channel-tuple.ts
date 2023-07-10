import { TIncomingDataChannelEvent } from './incoming-data-channel-event';
import { TSendPeerToPeerMessageFunction } from './send-peer-to-peer-message-function';

export type TDataChannelTuple = readonly [string, boolean | TIncomingDataChannelEvent | TSendPeerToPeerMessageFunction];
