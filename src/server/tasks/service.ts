import { querySystem } from "@/server/db";

export type TaskStatus="running"|"awaiting_input"|"awaiting_confirmation"|"completed"|"failed"|"cancelled";
export type TaskPlanStep={label:string;status:"pending"|"active"|"done"|"failed"};
export type ConversationTask={id:string;original_intent:string;source_text:string;gathered_facts:Record<string,unknown>;unresolved_ambiguity:unknown[];current_step:number;plan:TaskPlanStep[];status:TaskStatus;retry_count:number;verified_results:unknown[]};

const activeStatuses:TaskStatus[]=["running","awaiting_input","awaiting_confirmation"];

export async function getActiveTask(conversationId:string){
  const rows=await querySystem<ConversationTask>(`select id,original_intent,source_text,gathered_facts,unresolved_ambiguity,current_step,plan,status,retry_count,verified_results from public.conversation_tasks where conversation_id=$1 and status=any($2::public.conversation_task_status[]) order by updated_at desc limit 1`,[conversationId,activeStatuses]);
  return rows[0]??null;
}

export async function beginTask(conversationId:string,userId:string,text:string,prior:ConversationTask|null){
  if(prior){
    await querySystem(`update public.conversation_tasks set source_text=$2,status='running',last_error=null,retry_count=retry_count+1,updated_at=now() where id=$1`,[prior.id,text]);
    return {...prior,source_text:text,status:"running" as const,retry_count:prior.retry_count+1};
  }
  const rows=await querySystem<ConversationTask>(`insert into public.conversation_tasks(conversation_id,user_id,original_intent,source_text,plan) values($1,$2,$3,$3,$4) returning id,original_intent,source_text,gathered_facts,unresolved_ambiguity,current_step,plan,status,retry_count,verified_results`,[conversationId,userId,text,JSON.stringify([])]);
  return rows[0];
}

export async function saveTaskPlan(taskId:string,plan:TaskPlanStep[],currentStep=0){
  await querySystem(`update public.conversation_tasks set plan=$2,current_step=$3,updated_at=now() where id=$1`,[taskId,JSON.stringify(plan),currentStep]);
}
export async function recordTaskFact(taskId:string,key:string,value:unknown){
  await querySystem(`update public.conversation_tasks set gathered_facts=gathered_facts || jsonb_build_object($2::text,$3::jsonb),updated_at=now() where id=$1`,[taskId,key,JSON.stringify(value)]);
}
export async function recordVerifiedResult(taskId:string,result:unknown){
  await querySystem(`update public.conversation_tasks set verified_results=verified_results || jsonb_build_array($2::jsonb),updated_at=now() where id=$1`,[taskId,JSON.stringify(result)]);
}
export async function finishTask(taskId:string,status:Exclude<TaskStatus,"running">,error?:string){
  await querySystem(`update public.conversation_tasks set status=$2,last_error=$3,completed_at=case when $2 in ('completed','failed','cancelled') then now() else null end,updated_at=now() where id=$1`,[taskId,status,error??null]);
}
