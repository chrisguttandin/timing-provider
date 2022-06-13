import { GroupedObservable } from 'rxjs';

export type TGroupedObservable<Value, Property extends keyof Value, PropertyValue = Value[Property]> = PropertyValue extends any
    ? GroupedObservable<PropertyValue, Extract<Value, Record<Property, PropertyValue>>>
    : never;
