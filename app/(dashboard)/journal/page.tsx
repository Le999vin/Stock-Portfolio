"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useJournalEntries,
  useCreateJournalEntry,
  useUpdateJournalEntry,
  useDeleteJournalEntry,
  useSymbolSearch,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Plus,
  Trash2,
  Loader2,
  Search,
  X,
  Tag,
  ChevronRight,
  Pencil,
  ArrowLeft,
  SmilePlus,
} from "lucide-react";
import type { JournalEntry, SymbolSearchResult } from "@/types";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────

const MOOD_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Fearful",   color: "text-red-400"     },
  2: { label: "Cautious",  color: "text-orange-400"  },
  3: { label: "Neutral",   color: "text-yellow-400"  },
  4: { label: "Confident", color: "text-emerald-400" },
  5: { label: "Euphoric",  color: "text-violet-400"  },
};

const MOOD_EMOJIS: Record<number, string> = {
  1: "😰", 2: "😟", 3: "😐", 4: "😊", 5: "🤩",
};

// ── Helpers ───────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function bodyPreview(body: string, chars = 120): string {
  const plain = body.replace(/\n+/g, " ").trim();
  return plain.length > chars ? plain.slice(0, chars) + "…" : plain;
}

// ── Symbol autocomplete ───────────────────────────────────────────────────

function SymbolInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const debouncedQ = useDebounce(value, 280);
  const { data: results = [], isFetching } = useSymbolSearch(debouncedQ);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="AAPL (optional)"
        className="uppercase font-mono text-sm"
        maxLength={20}
      />
      {open && value.length >= 1 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-md border border-border/50 bg-card shadow-lg overflow-hidden max-h-44 overflow-y-auto">
          {isFetching && results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>
          ) : (
            results.slice(0, 6).map((r: SymbolSearchResult) => (
              <button
                key={r.symbol}
                type="button"
                onMouseDown={() => { onChange(r.symbol); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/30 text-left"
              >
                <span className="font-mono font-medium">{r.symbol}</span>
                <span className="text-xs text-muted-foreground truncate">{r.instrument_name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Tag input ─────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 20) {
      onChange([...tags, t]);
    }
    setDraft("");
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-border/50 bg-muted/30 text-muted-foreground"
          >
            #{tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="hover:text-foreground transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          placeholder="Add tag (Enter to add)…"
          className="text-sm h-8"
          maxLength={30}
        />
        <Button type="button" variant="ghost" size="sm" className="h-8" onClick={add} disabled={!draft.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Mood selector ─────────────────────────────────────────────────────────

function MoodSelector({ value, onChange }: { value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <div className="flex items-center gap-1">
      <SmilePlus className="h-3.5 w-3.5 text-muted-foreground mr-1" />
      {[1, 2, 3, 4, 5].map((m) => (
        <button
          key={m}
          type="button"
          title={MOOD_LABELS[m].label}
          onClick={() => onChange(value === m ? undefined : m)}
          className={cn(
            "text-base leading-none rounded transition-all duration-100",
            value === m
              ? "scale-125 opacity-100"
              : "opacity-40 hover:opacity-70 hover:scale-110"
          )}
        >
          {MOOD_EMOJIS[m]}
        </button>
      ))}
      {value && (
        <span className={cn("text-xs ml-1", MOOD_LABELS[value].color)}>
          {MOOD_LABELS[value].label}
        </span>
      )}
    </div>
  );
}

// ── Entry Editor ──────────────────────────────────────────────────────────

function EntryEditor({
  entry,
  onClose,
}: {
  entry?: JournalEntry;
  onClose: () => void;
}) {
  const isEdit = !!entry;
  const create = useCreateJournalEntry();
  const update = useUpdateJournalEntry(entry?.id ?? "");

  const [title,     setTitle]     = useState(entry?.title     ?? "");
  const [body,      setBody]      = useState(entry?.body      ?? "");
  const [symbol,    setSymbol]    = useState(entry?.symbol    ?? "");
  const [mood,      setMood]      = useState<number | undefined>(entry?.mood);
  const [tags,      setTags]      = useState<string[]>(entry?.tags ?? []);
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? new Date().toISOString().slice(0, 10));

  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);

  const isPending = create.isPending || update.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title: title.trim(),
      body:  body.trim(),
      entryDate,
      symbol: symbol.trim().toUpperCase() || undefined,
      mood,
      tags,
    };
    if (isEdit) {
      update.mutate(data, { onSuccess: onClose });
    } else {
      create.mutate(data, { onSuccess: onClose });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-lg border border-border/50 bg-card p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          {isEdit ? "Edit Entry" : "New Journal Entry"}
        </p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Title</label>
          <Input
            ref={titleRef}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What happened today?"
            maxLength={200}
          />
        </div>

        {/* Body */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Notes</label>
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your thoughts, analysis, lessons learned…"
            rows={7}
            maxLength={20_000}
            className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed min-h-[120px]"
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {body.length.toLocaleString()} / 20,000
          </p>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Date</label>
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Symbol (optional)</label>
            <SymbolInput value={symbol} onChange={setSymbol} />
          </div>
        </div>

        {/* Mood */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Market mood</label>
          <MoodSelector value={mood} onChange={setMood} />
        </div>

        {/* Tags */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tags</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={isPending || !title.trim() || !body.trim()} className="flex-1 gap-1.5">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
            {isEdit ? "Save Changes" : "Save Entry"}
          </Button>
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </motion.div>
  );
}

// ── Entry Card ────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  index,
  onEdit,
  onDelete,
  isDeleting,
}: {
  entry: JournalEntry;
  index: number;
  onEdit: (e: JournalEntry) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const mood = entry.mood;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-lg border border-border/50 bg-card overflow-hidden group"
    >
      {/* Header row */}
      <button
        type="button"
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Mood emoji */}
        {mood ? (
          <span className="text-xl leading-none shrink-0 mt-0.5" title={MOOD_LABELS[mood]?.label}>
            {MOOD_EMOJIS[mood]}
          </span>
        ) : (
          <div className="h-6 w-6 shrink-0 rounded-full bg-muted/30 mt-0.5" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold leading-snug">{entry.title}</p>
            {entry.symbol && (
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                {entry.symbol}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {expanded ? "" : bodyPreview(entry.body, 100)}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(entry.entryDate)}
          </span>
          <ChevronRight
            className={cn("h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-150",
              expanded && "rotate-90")}
          />
        </div>
      </button>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
              {/* Body text */}
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {entry.body}
              </p>

              {/* Tags */}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="h-3 w-3 text-muted-foreground/50" />
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded-full border border-border/40 text-muted-foreground bg-muted/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Mood bar */}
              {mood && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Mood:</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((m) => (
                      <div
                        key={m}
                        className={cn(
                          "h-1.5 w-4 rounded-full",
                          m <= mood ? "bg-emerald-400" : "bg-muted/40"
                        )}
                      />
                    ))}
                  </div>
                  <span className={cn("text-xs", MOOD_LABELS[mood]?.color)}>
                    {MOOD_LABELS[mood]?.label}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {entry.symbol && (
                  <Link
                    href={`/asset/${encodeURIComponent(entry.symbol)}`}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    View {entry.symbol}
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                    onClick={() => onEdit(entry)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground/50 hover:text-red-400 hover:bg-red-400/10 gap-1 transition-colors"
                    disabled={isDeleting}
                    onClick={() => onDelete(entry.id)}
                  >
                    {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Mood sparkline (mini bar chart) ──────────────────────────────────────

function MoodSparkline({ entries }: { entries: JournalEntry[] }) {
  const recent = entries.filter((e) => e.mood).slice(0, 30).reverse();
  if (recent.length < 2) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-card px-4 py-3 space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">Mood Trend</p>
      <div className="flex items-end gap-0.5 h-8">
        {recent.map((e, i) => {
          const pct = ((e.mood! - 1) / 4) * 100;
          const color =
            e.mood! >= 4 ? "bg-emerald-400" :
            e.mood! === 3 ? "bg-yellow-400" :
            "bg-red-400";
          return (
            <div
              key={e.id}
              title={`${formatDate(e.entryDate)} · ${MOOD_LABELS[e.mood!]?.label}`}
              className={cn("flex-1 rounded-sm transition-all", color)}
              style={{ height: `${Math.max(pct, 10)}%`, opacity: 0.6 + (i / recent.length) * 0.4 }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{formatDate(recent[0].entryDate)}</span>
        <span>{formatDate(recent[recent.length - 1].entryDate)}</span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function JournalPage() {
  const [showEditor,   setShowEditor]   = useState(false);
  const [editEntry,    setEditEntry]    = useState<JournalEntry | undefined>(undefined);
  const [filterSymbol, setFilterSymbol] = useState("");
  const [filterTag,    setFilterTag]    = useState("");
  const [searchQ,      setSearchQ]      = useState("");

  const debouncedQ      = useDebounce(searchQ,      400);
  const debouncedSymbol = useDebounce(filterSymbol, 300);

  const { data: entries = [], isLoading } = useJournalEntries({
    symbol: debouncedSymbol || undefined,
    tag:    filterTag || undefined,
    q:      debouncedQ || undefined,
  });

  const deleteEntry = useDeleteJournalEntry();

  // All unique tags across entries (for filter pills)
  const allTags = [...new Set(entries.flatMap((e) => e.tags ?? []))].sort();

  const handleEdit = useCallback((entry: JournalEntry) => {
    setEditEntry(entry);
    setShowEditor(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteEntry.mutate(id);
  }, [deleteEntry]);

  const handleNewEntry = () => {
    setEditEntry(undefined);
    setShowEditor(true);
  };

  const handleClose = () => {
    setShowEditor(false);
    setEditEntry(undefined);
  };

  const hasFilter = !!filterSymbol || !!filterTag || !!searchQ;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="text-lg font-semibold tracking-tight">Trade Journal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading…" : `${entries.length} entr${entries.length !== 1 ? "ies" : "y"}`}
            {hasFilter && " (filtered)"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
        >
          <Button onClick={handleNewEntry} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Entry
          </Button>
        </motion.div>
      </div>

      {/* Editor */}
      <AnimatePresence>
        {showEditor && (
          <EntryEditor key={editEntry?.id ?? "new"} entry={editEntry} onClose={handleClose} />
        )}
      </AnimatePresence>

      {/* Search + filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.2 }}
        className="space-y-2"
      >
        <div className="flex gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search titles…"
              className="pl-8"
            />
          </div>

          {/* Symbol filter */}
          <Input
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol"
            className="w-28 uppercase font-mono text-sm"
            maxLength={20}
          />

          {/* Clear */}
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearchQ(""); setFilterSymbol(""); setFilterTag(""); }}
              className="text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Tag filter pills */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                  filterTag === tag
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400"
                    : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Mood sparkline */}
      {!isLoading && entries.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.2 }}
        >
          <MoodSparkline entries={entries} />
        </motion.div>
      )}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center justify-center py-20 gap-5 rounded-lg border border-border/50 bg-card text-center px-6"
        >
          <div className="rounded-full bg-muted/30 p-5">
            <BookOpen className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div className="space-y-1.5">
            {hasFilter ? (
              <>
                <p className="font-medium">No entries match your filters</p>
                <p className="text-sm text-muted-foreground">Try clearing the search or tag filter.</p>
              </>
            ) : (
              <>
                <p className="font-medium">Your journal is empty</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Record your trades, thoughts, and lessons. Each entry can be linked to a symbol and given a mood rating.
                </p>
              </>
            )}
          </div>
          {!hasFilter && (
            <Button onClick={handleNewEntry} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Write your first entry
            </Button>
          )}
        </motion.div>
      )}

      {/* Entry list */}
      {(isLoading || entries.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="space-y-2"
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-card p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))
            : entries.map((entry, i) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDeleting={deleteEntry.isPending && deleteEntry.variables === entry.id}
                />
              ))}
        </motion.div>
      )}
    </div>
  );
}
