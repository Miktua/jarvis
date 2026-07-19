import { editTelegramMessage,sendTelegramMessage } from "./client";

export type AgentProgress="thinking"|"analyzing"|"adding"|"updating"|"deleting"|"done"|"error";
type Locale="ru";
const labels:Record<Locale,Record<AgentProgress,string>>={ru:{thinking:"💭 Думаю…",analyzing:"🔎 Анализирую…",adding:"➕ Добавляю…",updating:"✏️ Обновляю…",deleting:"🗑️ Удаляю…",done:"✅ Готово",error:"⚠️ Ошибка"}};

export function progressLocale(_text:string,_telegramLanguage?:string):Locale{return "ru";}

export type PlanStatus="pending"|"active"|"done"|"failed";
export type PlanStep={label:string;status:PlanStatus};
const marker:Record<PlanStatus,string>={pending:"⚪",active:"🟡",done:"✅",failed:"❌"};
function renderPlan(plan:PlanStep[]){if(plan.length===1)return `${marker[plan[0].status]} ${plan[0].label}…`;return `План\n${plan.map(step=>`${marker[step.status]} ${step.label}`).join("\n")}`;}

export async function createTelegramPlan(chatId:number|string){
  let plan:PlanStep[]=[];let messageId:number|undefined;
  try{messageId=(await sendTelegramMessage(chatId,labels.ru.thinking)).message_id;}catch(error){console.warn("[telegram:plan] unable to send plan",{error:error instanceof Error?error.message:"Unknown error"});}
  return async(next:PlanStep[])=>{plan=next;if(!messageId)return;try{await editTelegramMessage(chatId,messageId,renderPlan(plan));}catch(error){console.warn("[telegram:plan] unable to edit plan",{error:error instanceof Error?error.message:"Unknown error"});}};
}

export async function createTelegramProgress(chatId:number|string,text:string,telegramLanguage?:string){const locale=progressLocale(text,telegramLanguage);let current:AgentProgress="thinking";let messageId:number|undefined;
  try{messageId=(await sendTelegramMessage(chatId,labels[locale].thinking)).message_id;}catch(error){console.warn("[telegram:progress] unable to send status",{error:error instanceof Error?error.message:"Unknown error"});}
  return async(status:AgentProgress)=>{if(status===current)return;current=status;if(!messageId)return;try{await editTelegramMessage(chatId,messageId,labels[locale][status]);}catch(error){console.warn("[telegram:progress] unable to edit status",{status,error:error instanceof Error?error.message:"Unknown error"});}};
}
