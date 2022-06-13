import { OperatorFunction, groupBy } from 'rxjs';
import { TGroupedObservable } from '../types';

export const groupByProperty = <Value, Property extends keyof Value>(
    property: Property
): OperatorFunction<Value, TGroupedObservable<Value, Property>> =>
    <OperatorFunction<Value, TGroupedObservable<Value, Property>>>groupBy((value: Value) => value[property]);
