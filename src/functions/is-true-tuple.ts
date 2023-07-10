export const isTrueTuple = <FirstValue, SecondValue>(
    tuple: readonly [FirstValue, SecondValue]
): tuple is [FirstValue, SecondValue extends true ? SecondValue : never] => tuple[1] === true;
