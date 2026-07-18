"use client";

import { useState } from "react";

type Rule = { id: string; instruction: string; enabled: boolean };

export function TableRulesPanel({ tableId, initialRules }: { tableId: string; initialRules: Rule[] }) {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState(initialRules);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(nextRules: Rule[]) {
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/tables/${tableId}/rules`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rules: nextRules }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save rules");
      setRules(data.rules);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save rules"); }
    finally { setSaving(false); }
  }

  function addRule() {
    const instruction = draft.trim(); if (!instruction) return;
    const next = [...rules, { id: crypto.randomUUID(), instruction, enabled: true }];
    setDraft(""); void save(next);
  }

  function updateRule(id: string, update: Partial<Rule>) { void save(rules.map(rule => rule.id === id ? { ...rule, ...update } : rule)); }
  function removeRule(id: string) { void save(rules.filter(rule => rule.id !== id)); }

  return <div className="table-rules">
    <button type="button" className="secondary" onClick={() => setOpen(value => !value)}>AI rules{rules.length ? ` (${rules.length})` : ""}</button>
    {open && <section className="table-rules-popover">
      <div><p className="eyebrow">TABLE AUTOMATION</p><h2>AI rules</h2><p className="muted">Guidance Jarvis follows whenever it adds or edits rows in this table.</p></div>
      <div className="rule-add"><textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="e.g. Classify each new item using the existing category values." maxLength={1000} /><button type="button" disabled={saving || !draft.trim()} onClick={addRule}>Add rule</button></div>
      {error && <p className="error">{error}</p>}
      <ul>{rules.length ? rules.map(rule => <li key={rule.id}><label><input type="checkbox" checked={rule.enabled} disabled={saving} onChange={event => updateRule(rule.id, { enabled: event.target.checked })} /><span>{rule.instruction}</span></label><button type="button" className="danger" disabled={saving} onClick={() => removeRule(rule.id)}>Remove</button></li>) : <li className="muted">No rules yet. Add a clear instruction for this table.</li>}</ul>
    </section>}
  </div>;
}
