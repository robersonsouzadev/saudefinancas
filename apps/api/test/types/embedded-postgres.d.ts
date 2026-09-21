declare module 'embedded-postgres' {
  export interface PostgresOptions {
    port?: number;
    databaseDir?: string;
    user?: string;
    password?: string;
    initialDatabase?: string;
    persistent?: boolean;
    [key: string]: any;
  }

  export default class EmbeddedPostgres {
    constructor(options?: Partial<PostgresOptions>);
    initialise(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    getPgClient(database?: string, host?: string): any;
  }
}
