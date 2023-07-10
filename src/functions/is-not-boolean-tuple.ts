export const isNotBooleanTuple = <FirstValue, SecondValue>(
    tuple: readonly [FirstValue, SecondValue]
): tuple is [FirstValue, SecondValue extends boolean ? never : SecondValue] => typeof tuple[1] !== 'boolean';
