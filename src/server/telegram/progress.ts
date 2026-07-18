import { editTelegramMessage,sendTelegramMessage } from "./client";

export type AgentProgress="thinking"|"analyzing"|"adding"|"updating"|"deleting"|"done"|"error";
type Locale="ru"|"en";
const labels:Record<Locale,Record<AgentProgress,string>>={
  ru:{thinking:"💭 Думаю…",analyzing:"🔎 Анализирую…",adding:"➕ Добавляю…",updating:"✏️ Обновляю…",deleting:"🗑️ Удаляю…",done:"✅ Готово",error:"⚠️ Ошибка"},
  en:{thinking:"💭 Thinking…",analyzing:"🔎 Analyzing…",adding:"➕ Adding…",updating:"✏️ Updating…",deleting:"🗑️ Deleting…",done:"✅ Done",error:"⚠️ Error"},
};

export function progressLocale(text:string,telegramLanguage?:string):Locale{if(/[а-яё]/iu.test(text))return "ru";if(/[a-z]/iu.test(text))return "en";return telegramLanguage?.toLowerCase().startsWith("ru")?"ru":"en";}

export async function createTelegramProgress(chatId:number|string,text:string,telegramLanguage?:string){const locale=progressLocale(text,telegramLanguage);let current:AgentProgress="thinking";let messageId:number|undefined;
  try{messageId=(await sendTelegramMessage(chatId,labels[locale].thinking)).message_id;}catch(error){console.warn("[telegram:progress] unable to send status",{error:error instanceof Error?error.message:"Unknown error"});}
  return async(status:AgentProgress)=>{if(status===current)return;current=status;if(!messageId)return;try{await editTelegramMessage(chatId,messageId,labels[locale][status]);}catch(error){console.warn("[telegram:progress] unable to edit status",{status,error:error instanceof Error?error.message:"Unknown error"});}};
}
