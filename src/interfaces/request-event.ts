export interface IRequestEvent {
    message:
        | {
              isActive: true;

              label: string;

              mask: {
                  client: {
                      id: string;
                  };

                  token: string;
              };

              type: undefined;
          }
        | {
              isActive: false;

              label: undefined;

              mask: {
                  client: {
                      id: string;
                  };

                  token: string;
              };

              type: undefined;
          };

    type: 'request';
}
