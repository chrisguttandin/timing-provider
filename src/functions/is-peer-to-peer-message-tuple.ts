export const isPeerToPeerMessageTuple = <FirstValue, SecondValue>(
    tuple: readonly [FirstValue, SecondValue]
): tuple is [
    FirstValue,
    SecondValue extends (...args: any[]) => any ? never : SecondValue extends Record<any, any> ? SecondValue : never
] => tuple[1] !== null && typeof tuple[1] === 'object';
