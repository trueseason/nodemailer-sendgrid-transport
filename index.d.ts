export = SendGridTransport;
declare function SendGridTransport(options: any): void;
declare class SendGridTransport {
    constructor(options: any);
    options: any;
    name: string;
    version: any;
    send(mail: any, callback: any): Promise<any>;
}