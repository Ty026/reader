export interface IsomorphicDB {
  query: (sql: string, params?: any[]) => Promise<any[]>;
  begin: <T>(fn: (query: IsomorphicDB["query"]) => Promise<T>) => Promise<T>;
  connect: () => Promise<void>;
  close: () => Promise<void>;
  onCloseEvent: (listener: () => void) => void;
}
