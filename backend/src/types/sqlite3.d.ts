declare module 'sqlite3' {
  export class Database {
    constructor(filename: string);
    run(sql: string, callback?: (err: Error | null) => void): void;
    get(sql: string, params: any[], callback: (err: Error | null, row: any) => void): void;
    all(sql: string, params: any[], callback: (err: Error | null, rows: any[]) => void): void;
    close(callback?: (err: Error | null) => void): void;
  }
}
