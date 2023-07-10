export const isSendPeerToPeerMessageTuple = <FirstValue, SecondValue>(
    tuple: readonly [FirstValue, SecondValue]
): tuple is [FirstValue, SecondValue extends (...args: any[]) => any ? SecondValue : never] => typeof tuple[1] === 'function';
