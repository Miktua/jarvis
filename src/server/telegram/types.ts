export type TelegramUser={id:number;username?:string;language_code?:string};
export type TelegramMessage={message_id:number;chat:{id:number};from?:TelegramUser;text?:string;caption?:string;voice?:{file_id:string;file_size?:number;mime_type?:string};photo?:Array<{file_id:string;file_size?:number}>;document?:{file_id:string;file_size?:number;mime_type?:string;file_name?:string}};
export type TelegramUpdate={update_id:number;message?:TelegramMessage;callback_query?:{id:string;from:TelegramUser;data?:string;message?:TelegramMessage}};
