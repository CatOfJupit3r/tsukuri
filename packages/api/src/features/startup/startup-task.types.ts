/** Work a module needs done once before the API serves requests, such as connecting to a database. */
export interface iStartupTask {
  readonly name: string;
  run: () => Promise<void>;
}
