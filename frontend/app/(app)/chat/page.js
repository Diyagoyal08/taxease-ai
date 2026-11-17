"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import { Notice, PageHeader, Spinner } from "@/components/ui";
import { askAssistant } from "@/lib/api";
import { addActivity } from "@/lib/store";

const SUGGESTIONS = [
  "What is the limit of agricultural income allowed in ITR-1?",
  "Within how many days must I e-verify my return after filing?",
  "From which date do the new GST rates apply?",
];

function Sources({ sources }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="sources">
      {sources.map((source) => (
        <details className="source" key={source.number}>
          <summary>
            [{source.number}] {source.source}, page {source.page}
          </summary>
          <p>{source.excerpt}</p>
        </details>
      ))}
    </div>
  );
}

function BotMessage({ result }) {
  const serviceDown = !result.answered && result.error;
  return (
    <div className="bubble bot">
      {result.answered ? (
        <p className="answer">{result.answer}</p>
      ) : serviceDown ? (
        <>
          <p className="answer">
            The answer writer is not available right now, but these passages from the official documents may still
            help:
          </p>
          <details style={{ marginTop: 8, fontSize: 13 }}>
            <summary>Technical details</summary>
            <p className="mono" style={{ overflowWrap: "anywhere" }}>
              {result.error}
            </p>
          </details>
        </>
      ) : (
        <p className="answer">{result.answer}</p>
      )}
      <Sources sources={result.sources} />
      <p className="muted" style={{ marginTop: 12, fontSize: 12.5 }}>
        {result.disclaimer}
      </p>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  async function send(question) {
    const clean = question.trim();
    if (clean.length < 3 || busy) return;
    setError("");
    setText("");
    setMessages((current) => [...current, { role: "user", text: clean }]);
    setBusy(true);
    try {
      const result = await askAssistant(clean);
      setMessages((current) => [...current, { role: "bot", result }]);
      addActivity("Asked the assistant a question");
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page chat-page">
      <PageHeader
        title="Assistant"
        subtitle="Ask about income tax or GST. Answers come only from the official documents you added, and the source is shown."
      />

      <div className="chat-log" aria-live="polite">
        {messages.length === 0 ? (
          <div>
            <p className="muted" style={{ marginBottom: 12 }}>
              Try one of these:
            </p>
            <div className="chips">
              {SUGGESTIONS.map((suggestion) => (
                <button type="button" key={suggestion} className="chip-btn" onClick={() => send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) =>
          message.role === "user" ? (
            <div className="bubble user" key={index}>
              {message.text}
            </div>
          ) : (
            <BotMessage result={message.result} key={index} />
          )
        )}

        {busy ? (
          <div className="bubble bot">
            <Spinner label="Searching the documents…" />
          </div>
        ) : null}
        {error ? (
          <Notice kind="error" title="The assistant could not answer">
            {error}
          </Notice>
        ) : null}
        <div ref={bottom} />
      </div>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          send(text);
        }}
      >
        <label className="sr-only" htmlFor="question">
          Your question
        </label>
        <input
          id="question"
          className="input"
          placeholder="Ask a tax or GST question"
          maxLength={500}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="btn btn-dark" disabled={busy || text.trim().length < 3}>
          <Icon name="send" size={18} />
          Ask
        </button>
      </form>
    </div>
  );
}
