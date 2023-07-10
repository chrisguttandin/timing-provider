import { TSendPeerToPeerMessageFunction } from '../types';

export const findSendPeerToPeerMessageFunction = (key: string, sendPeerToPeerMessageTuples: [string, TSendPeerToPeerMessageFunction][]) => {
    const sendPeerToPeerMessageTuple = sendPeerToPeerMessageTuples.find(([clientId]) => clientId === key);

    if (sendPeerToPeerMessageTuple === undefined) {
        throw new Error('There is no tuple with the given key.');
    }

    return sendPeerToPeerMessageTuple[1];
};
