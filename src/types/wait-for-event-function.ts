import { Observable } from 'rxjs';

export type TWaitForEventFunction = <T extends EventTarget>(eventTarget: T, type: string) => Observable<T>;
