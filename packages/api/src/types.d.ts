declare module "bull" {
  import Bull from "bull";
  export default Bull;
  export { Bull };
}

declare module "node-imap" {
  export = Imap;
}

declare module "imap" {
  export = Imap;
}

declare module "mailparser" {
  export function simpleParser(
    stream: any,
    callback: (err: Error | null, parsed: any) => void,
  ): void;
}

declare module "bcryptjs" {
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function hash(data: string, saltRounds: number): Promise<string>;
}

declare module "webpush" {
  export function sendNotification(subscription: any, payload: any, options?: any): Promise<any>;
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
}
