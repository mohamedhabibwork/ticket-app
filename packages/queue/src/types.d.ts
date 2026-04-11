declare module "imap" {
  export = Imap;
}

declare module "mailparser" {
  export function simpleParser(
    stream: any,
    callback: (err: Error | null, parsed: any) => void,
  ): void;
}
