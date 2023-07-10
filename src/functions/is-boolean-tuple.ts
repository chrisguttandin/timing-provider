export const isBooleanTuple = <FirstValue, SecondValue>(
    tuple: readonly [FirstValue, SecondValue]
): tuple is [FirstValue, SecondValue extends boolean ? SecondValue : never] => typeof tuple[1] === 'boolean';
