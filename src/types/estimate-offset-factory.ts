import { TEstimateOffsetFunction } from './estimate-offset-function';

export type TEstimateOffsetFactory = (performance: Window['performance']) => TEstimateOffsetFunction;
