import { TOutgoingDataChannelEvent } from './outgoing-data-channel-event';

export type TSendPeerToPeerMessageFunction = (event: TOutgoingDataChannelEvent) => boolean;
