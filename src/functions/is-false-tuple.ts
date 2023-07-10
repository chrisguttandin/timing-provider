export const isFalseTuple = <FirstValue, SecondValue>(
    tuple: readonly [FirstValue, SecondValue]
): tuple is [FirstValue, SecondValue extends false ? SecondValue : never] => tuple[1] === false;
