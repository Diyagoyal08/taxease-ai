"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icons";
import { CapsuleBars, Donut } from "@/components/charts";
import { Disclaimer, Notice, Pill, Spinner } from "@/components/ui";
import { getDeadlines } from "@/lib/api";
import { daysText, formatDate, shortName, timeAgo } from "@/lib/format";
import { clearActivity, useActivity } from "@/lib/store";

export default function Dashboard() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const activity = useActivity();

  useEffect(() => {
    getDeadlines()
      .then(setItems)
      .catch((problem) => setError(problem.message));
  }, []);

  const view = useMemo(() => {
    if (!items) return null;
    const next = items[0];
    const urgent = items.filter((item) => item.urgent);
    const within30 = items.filter((item) => item.days_left <= 30).length;
    const incomeTax = items.filter((item) => item.category === "Income Tax").length;
    const gst = items.filter((item) => item.category === "GST").length;
    const bars = items.slice(0, 7).map((item) => ({
      id: item.id,
      label: shortName(item.name),
      value: item.days_left,
      valueText: daysText(item.days_left),
      urgent: item.urgent,
      detail: `${item.name}: ${daysText(item.days_left)} left, due ${formatDate(item.due_date)}`,
    }));
    return { next, urgent, within30, incomeTax, gst, bars, total: items.length };
  }, [items]);

  const shown = useMemo(() => {
    if (!items) return [];
    const text = query.trim().toLowerCase();
    if (!text) return items;
    return items.filter(
      (item) => item.name.toLowerCase().includes(text) || item.category.toLowerCase().includes(text)
    );
  }, [items, query]);

  const percent = (part) => (view && view.total ? Math.round((part / view.total) * 100) : 0);

  return (
    <div className="dash">
      <section className="dash-main">
        <div className="dash-top">
          <div>
            <h1>Dashboard</h1>
            <p className="sub">Tax and GST deadlines at a glance</p>
          </div>
          <div className="search">
            <Icon name="search" />
            <input
              className="input"
              type="search"
              placeholder="Search deadlines"
              aria-label="Search deadlines"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        {error ? (
          <Notice kind="error" title="Deadlines could not be loaded">
            {error}
          </Notice>
        ) : null}

        {!items && !error ? <Spinner label="Loading deadlines…" /> : null}

        {view ? (
          <>
            <div className="stat-grid">
              <article className="stat stat-accent">
                <div className="stat-head">
                  <span>Next deadline</span>
                  {view.next ? <span className="chip-soft">{formatDate(view.next.due_date)}</span> : null}
                </div>
                <p className="stat-big" data-testid="next-days">
                  {view.next ? daysText(view.next.days_left) : "None"}
                </p>
                <p className="stat-note">{view.next ? view.next.name : "No deadlines in the list."}</p>
                <p className="stat-foot">{view.within30} due in the next 30 days</p>
              </article>

              <article className="stat stat-sky">
                <div className="stat-head">
                  <span>Due this week</span>
                  <span className="chip-soft">{view.urgent.length === 0 ? "All clear" : "Act soon"}</span>
                </div>
                <p className="stat-big">{view.urgent.length}</p>
                <p className="stat-note">
                  {view.urgent.length === 0
                    ? "Nothing is due this week."
                    : view.urgent
                        .slice(0, 2)
                        .map((item) => shortName(item.name))
                        .join(", ")}
                </p>
                <p className="stat-foot">Dates can move when the government extends them</p>
              </article>

              <article className="stat stat-dark">
                <h2>Ask the assistant</h2>
                <p>Answers come from official tax and GST documents, with the source shown.</p>
                <Link href="/chat" className="btn btn-dark">
                  Open assistant
                </Link>
              </article>
            </div>

            <div className="section-title">
              <h2>Next 7 deadlines</h2>
              <span className="section-sub">Taller bar = more days left. Coral bars are due within 7 days.</span>
            </div>
            <CapsuleBars items={view.bars} />

            <div className="list-head">
              <h2>All deadlines</h2>
              <span className="info-pill">Dates live in backend/deadlines.json</span>
            </div>
            {shown.length === 0 ? (
              <p className="empty">No deadline matches “{query}”. Try a shorter word.</p>
            ) : (
              <ul className="rows">
                {shown.map((item) => (
                  <li className="row" key={item.id}>
                    <span className={"tag " + (item.category === "GST" ? "tag-gst" : "tag-it")}>
                      {item.category === "GST" ? "GST" : "IT"}
                    </span>
                    <div>
                      <p className="row-name">{item.name}</p>
                      <p className="row-date">Due {formatDate(item.due_date)}</p>
                    </div>
                    <Pill tone={item.urgent ? "bad" : "neutral"}>{daysText(item.days_left)}</Pill>
                  </li>
                ))}
              </ul>
            )}
            <Disclaimer />
          </>
        ) : null}
      </section>

      <aside className="rail">
        <div className="rail-top">
          <h2>Deadlines by type</h2>
          <p className="sub">Share of the {view ? view.total : 0} deadlines in your list</p>
          <div className="donut-wrap">
            <Donut
              segments={[
                { label: "Income Tax", value: view ? view.incomeTax : 0, color: "var(--accent)" },
                { label: "GST", value: view ? view.gst : 0, color: "var(--sky)" },
              ]}
              centerTop="Total"
              centerBottom={view ? String(view.total) : "0"}
            />
          </div>
          <div className="legend">
            <div className="legend-row">
              <div className="legend-head">
                <span>Income Tax</span>
                <strong>{percent(view ? view.incomeTax : 0)}%</strong>
              </div>
              <div className="meter">
                <span style={{ width: `${percent(view ? view.incomeTax : 0)}%`, background: "var(--accent)" }} />
              </div>
            </div>
            <div className="legend-row">
              <div className="legend-head">
                <span>GST</span>
                <strong>{percent(view ? view.gst : 0)}%</strong>
              </div>
              <div className="meter">
                <span style={{ width: `${percent(view ? view.gst : 0)}%`, background: "var(--sky)" }} />
              </div>
            </div>
            <div className="legend-row">
              <div className="legend-head">
                <span>Due within 7 days</span>
                <strong>{percent(view ? view.urgent.length : 0)}%</strong>
              </div>
              <div className="meter">
                <span style={{ width: `${percent(view ? view.urgent.length : 0)}%`, background: "var(--coral)" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="rail-bottom">
          <div className="head">
            <h2>Recent activity</h2>
            {activity.length > 0 ? (
              <button
                type="button"
                className="link-button"
                onClick={clearActivity}
              >
                Clear
              </button>
            ) : null}
          </div>
          {activity.length === 0 ? (
            <p className="muted">
              Nothing yet. <Link href="/tax">Calculate your tax</Link> or <Link href="/bills">upload a bill</Link> and
              it will show up here.
            </p>
          ) : (
            <ul className="activity">
              {activity.map((entry) => (
                <li key={entry.at + entry.text}>
                  <p className="what">{entry.text}</p>
                  <p className="when">{timeAgo(entry.at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
