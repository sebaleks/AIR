declare module "node:crypto" {
  export function randomUUID(): string;
}

declare module "node:http" {
  export type IncomingMessage = AsyncIterable<Uint8Array> & {
    method?: string;
    url?: string;
  };

  export type ServerResponse = {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(chunk?: string): void;
  };

  export type AddressInfo = {
    port: number;
    address: string;
    family: string;
  };

  export type Server = {
    listen(port: number, cb?: () => void): void;
    listen(port: number, hostname: string, cb?: () => void): void;
    address(): AddressInfo | string | null;
    close(cb?: (error?: Error) => void): void;
  };

  export function createServer(
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
  ): Server;
}

declare module "node:test" {
  type TestFn = (name: string, fn: () => void | Promise<void>) => void;
  const test: TestFn;
  export default test;
}

declare module "node:assert/strict" {
  type Assert = {
    equal(actual: unknown, expected: unknown): void;
    ok(value: unknown): void;
  };
  const assert: Assert;
  export default assert;
}

declare const process: {
  env: Record<string, string | undefined>;
};

declare class Buffer {
  static isBuffer(value: unknown): value is Buffer;
  static from(value: string | Uint8Array): Buffer;
  static concat(list: Buffer[]): Buffer;
  toString(encoding?: string): string;
}
