export declare const REDIS_HOST: string
export declare const REDIS_PORT: number
export declare function createDb(): {
  get: (key: string) => Promise<string | null>
  set: (key: string) => Promise<unknown>
  del: (key: string) => Promise<number>
}
export type Db = ReturnType<typeof createDb>
export declare function checkRedis(): Promise<void>
