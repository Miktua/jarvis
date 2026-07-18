delete from public.messages duplicate
using public.messages original
where duplicate.conversation_id = original.conversation_id
  and duplicate.telegram_message_id = original.telegram_message_id
  and duplicate.telegram_message_id is not null
  and (duplicate.created_at, duplicate.id) > (original.created_at, original.id);

create unique index messages_conversation_telegram_message_id_key
  on public.messages (conversation_id, telegram_message_id)
  where telegram_message_id is not null;
