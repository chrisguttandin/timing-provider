export const createBackoff = (base: number) =>
    <const>[
        () => base ** 2,
        () => {
            // tslint:disable-next-line:no-parameter-reassignment
            base += 1;
        }
    ];
