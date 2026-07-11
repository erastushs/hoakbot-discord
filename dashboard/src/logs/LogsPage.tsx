import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, SlidersHorizontal, X } from 'lucide-react';

import type { APIClient } from '../api/client.js';
import { Button, Card, Skeleton } from '../components/index.js';
import type { DashboardLogEntry, DashboardLogLevel } from '../contracts.js';

const LEVELS: DashboardLogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
const MODULES = ['Voice', 'Welcome', 'Goodbye', 'Logging', 'Moderation', 'Shrine', 'Security', 'Dashboard', 'API', 'Database', 'Scheduler'];
const QUICK_FILTERS = ['All', 'Errors', 'Warnings', 'Voice', 'Security'] as const;
const INITIAL_LIMIT = 100;
const MAX_RENDERED_LOGS = 1_000;

type TimeFilter = '15m' | '1h' | 'today' | 'yesterday' | '7d' | 'all';
type ConnectionState = 'idle' | 'connecting' | 'connected' | 'lost';

interface LogsPageProps {
  api: APIClient;
}

export function LogsPage({ api }: LogsPageProps) {
  const [logs, setLogs] = useState<DashboardLogEntry[]>([]);
  const [bufferedLogs, setBufferedLogs] = useState<DashboardLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<DashboardLogEntry | undefined>();
  const [search, setSearch] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<DashboardLogLevel[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [liveMode, setLiveMode] = useState(false);
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadLimit, setLoadLimit] = useState(INITIAL_LIMIT);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  const query = useMemo(() => ({
    limit: loadLimit,
    search: search.trim() || undefined,
    levels: selectedLevels,
    modules: selectedModules,
    since: sinceFromFilter(timeFilter),
  }), [loadLimit, search, selectedLevels, selectedModules, timeFilter]);

  const loadLogs = useCallback(async (cursor?: string) => {
    setStatus((current) => cursor ? current : 'loading');
    setError(undefined);
    try {
      const response = await api.getLogs({ ...query, cursor });
      setLogs((current) => boundedLogs(cursor ? [...current, ...response.logs] : response.logs));
      setNextCursor(response.nextCursor);
      setStatus('ready');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Logs could not be loaded.');
      setStatus('error');
    }
  }, [api, query]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!liveMode) {
      setConnection('idle');
      return;
    }

    let eventSource: EventSource | undefined;
    let reconnectTimer: number | undefined;
    let closed = false;

    const connect = () => {
      setConnection('connecting');
      eventSource = new EventSource(api.logsStreamUrl(), { withCredentials: true });
      eventSource.addEventListener('open', () => setConnection('connected'));
      eventSource.addEventListener('log', (event) => {
        const entry = JSON.parse((event as MessageEvent).data) as DashboardLogEntry;
        if (!matchesFilters(entry, search, selectedLevels, selectedModules, timeFilter)) return;
        if (paused) {
          setBufferedLogs((current) => boundedLogs([entry, ...current]));
          return;
        }

        setLogs((current) => boundedLogs([entry, ...current]));
      });
      eventSource.addEventListener('error', () => {
        eventSource?.close();
        if (closed) return;
        setConnection('lost');
        reconnectTimer = window.setTimeout(connect, 2_500);
      });
    };

    connect();

    return () => {
      closed = true;
      eventSource?.close();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
    };
  }, [api, liveMode, paused, search, selectedLevels, selectedModules, timeFilter]);

  useEffect(() => {
    if (!paused && bufferedLogs.length > 0) {
      setLogs((current) => boundedLogs([...bufferedLogs, ...current]));
      setBufferedLogs([]);
    }
  }, [bufferedLogs, paused]);

  useEffect(() => {
    if (liveMode && autoScroll) {
      bottomRef.current?.scrollIntoView({ block: 'end', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }, [autoScroll, liveMode, logs]);

  useEffect(() => {
    if (selectedLog) drawerCloseRef.current?.focus();
  }, [selectedLog]);

  useEffect(() => {
    if (!filtersOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (filtersRef.current?.contains(event.target as Node)) return;
      setFiltersOpen(false);
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setFiltersOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [filtersOpen]);

  const visibleLogs = useMemo(() => logs.filter((entry) => matchesFilters(entry, search, selectedLevels, selectedModules, timeFilter)), [logs, search, selectedLevels, selectedModules, timeFilter]);
  const stats = useMemo(() => summarize(visibleLogs), [visibleLogs]);

  function applyQuickFilter(filter: (typeof QUICK_FILTERS)[number]) {
    if (filter === 'All') {
      setSelectedLevels([]);
      setSelectedModules([]);
      setTimeFilter('all');
      setSearch('');
    } else if (filter === 'Errors') {
      toggleSelected('ERROR', selectedLevels, setSelectedLevels);
    } else if (filter === 'Warnings') {
      toggleSelected('WARN', selectedLevels, setSelectedLevels);
    } else if (MODULES.includes(filter)) {
      toggleSelected(filter, selectedModules, setSelectedModules);
    }
  }

  function resetFilters() {
    setSelectedLevels([]);
    setSelectedModules([]);
    setTimeFilter('all');
    setSearch('');
    setLiveMode(false);
    setAutoScroll(true);
    setPaused(false);
    setLoadLimit(INITIAL_LIMIT);
  }

  return (
    <div className="grid gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-dashboard-border-subtle/70 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-heading-l text-dashboard-text-primary">Logs</h1>
          <button aria-label="Toggle live mode" aria-pressed={liveMode} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-dashboard-border-subtle bg-dashboard-bg-control/48 px-2.5 text-caption font-semibold uppercase tracking-[0.12em] text-dashboard-text-secondary transition hover:border-dashboard-accent-primary/50 hover:text-dashboard-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring" onClick={() => setLiveMode((current) => !current)} type="button">
            <span className={liveMode ? 'text-dashboard-success' : 'text-dashboard-text-disabled'} aria-hidden>{liveMode ? '●' : '○'}</span>
            {liveMode ? 'Live' : 'History'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button className="h-8 px-3" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => void loadLogs()} size="sm" variant="ghost">Refresh</Button>
          <Button className="h-8 px-3" disabled={!nextCursor} onClick={() => void loadLogs(nextCursor)} size="sm" variant="ghost">Load more</Button>
        </div>
      </header>

      <section className="flex flex-col gap-2 tablet:flex-row tablet:items-center" aria-label="Log controls">
        <label className="relative min-w-0 flex-1" htmlFor="logs-search">
          <span className="sr-only">Search logs</span>
          <input id="logs-search" aria-label="Search logs" className="h-8 w-full rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-control/54 px-3 text-caption text-dashboard-text-primary shadow-elevation-0 transition placeholder:text-dashboard-text-disabled hover:border-dashboard-accent-primary/45 focus:border-dashboard-accent-primary focus:outline-none focus:ring-2 focus:ring-dashboard-focus-ring/20" onChange={(event) => setSearch(event.target.value)} placeholder="Search message, guild, user, module..." value={search} />
        </label>

        <div aria-label="Quick log filters" className="-mx-1 flex gap-1 overflow-x-auto px-1 tablet:mx-0 tablet:overflow-visible tablet:px-0" role="toolbar">
          {QUICK_FILTERS.map((filter) => (
            <button className="h-8 shrink-0 rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-control/42 px-2.5 text-caption font-medium text-dashboard-text-secondary transition hover:border-dashboard-accent-primary/50 hover:bg-dashboard-bg-control/68 hover:text-dashboard-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring" key={filter} onClick={() => applyQuickFilter(filter)} type="button">
              {filter}
            </button>
          ))}
          <div className="relative shrink-0" ref={filtersRef}>
            <button aria-controls="logs-filter-popover" aria-expanded={filtersOpen} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-control/56 px-2.5 text-caption font-semibold text-dashboard-text-primary transition hover:border-dashboard-accent-primary/50 hover:bg-dashboard-bg-control/78 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring" onClick={() => setFiltersOpen((current) => !current)} type="button">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </button>
            {filtersOpen ? (
              <FilterPopover
                autoScroll={autoScroll}
                liveMode={liveMode}
                loadLimit={loadLimit}
                onReset={resetFilters}
                paused={paused}
                selectedLevels={selectedLevels}
                selectedModules={selectedModules}
                setAutoScroll={setAutoScroll}
                setLiveMode={setLiveMode}
                setLoadLimit={setLoadLimit}
                setPaused={setPaused}
                setSelectedLevels={setSelectedLevels}
                setSelectedModules={setSelectedModules}
                setTimeFilter={setTimeFilter}
                timeFilter={timeFilter}
              />
            ) : null}
          </div>
        </div>
      </section>

      <SummaryLine stats={stats} visible={visibleLogs.length} />

      {connection === 'lost' ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashboard-warning/45 bg-dashboard-warning/10 px-3 py-2 text-caption text-dashboard-text-primary" role="alert">
          <AlertTriangle className="h-4 w-4 text-dashboard-warning" />
          <span>Connection lost. Reconnecting automatically.</span>
          <Button onClick={() => setLiveMode(false)} size="sm" variant="secondary">Stop live</Button>
        </div>
      ) : null}

      <Card className="overflow-hidden rounded-lg border-dashboard-border-subtle/80 p-0 shadow-elevation-0">
        {status === 'loading' ? <LogSkeleton /> : status === 'error' ? <ErrorState error={error} onRetry={() => void loadLogs()} /> : visibleLogs.length === 0 ? <EmptyLogs /> : (
          <div className="max-h-[min(70vh,56rem)] overflow-y-auto" role="region" aria-label="Log entries" tabIndex={0}>
            <div className="sticky top-0 z-10 hidden grid-cols-[5.25rem_4.75rem_7rem_1fr] border-b border-dashboard-border-subtle bg-dashboard-bg-card/95 px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-dashboard-text-tertiary backdrop-blur-xl tablet:grid">
              <span>Time</span>
              <span>Level</span>
              <span>Module</span>
              <span>Message</span>
            </div>
            <div className="grid divide-y divide-dashboard-border-subtle/70">
              {visibleLogs.map((entry) => <LogRow entry={entry} key={entry.id} onSelect={setSelectedLog} />)}
            </div>
            <div ref={bottomRef} />
          </div>
        )}
      </Card>

      {selectedLog ? <LogDrawer closeRef={drawerCloseRef} entry={selectedLog} onClose={() => setSelectedLog(undefined)} /> : null}
    </div>
  );
}

function FilterPopover({ autoScroll, liveMode, loadLimit, onReset, paused, selectedLevels, selectedModules, setAutoScroll, setLiveMode, setLoadLimit, setPaused, setSelectedLevels, setSelectedModules, setTimeFilter, timeFilter }: { autoScroll: boolean; liveMode: boolean; loadLimit: number; onReset(): void; paused: boolean; selectedLevels: DashboardLogLevel[]; selectedModules: string[]; setAutoScroll(value: boolean): void; setLiveMode(value: boolean): void; setLoadLimit(value: number): void; setPaused(value: boolean): void; setSelectedLevels(value: DashboardLogLevel[]): void; setSelectedModules(value: string[]): void; setTimeFilter(value: TimeFilter): void; timeFilter: TimeFilter }) {
  return (
    <div className="absolute right-0 top-10 z-dropdown grid max-h-[min(78vh,42rem)] w-[min(22rem,calc(100vw-2rem))] gap-4 overflow-y-auto rounded-xl border border-dashboard-border-subtle bg-dashboard-bg-page/98 p-4 text-small shadow-elevation-3 backdrop-blur-xl" id="logs-filter-popover" role="dialog" aria-label="Log filters">
      <FilterGroup title="History">
        <SegmentedOptions ariaLabel="History size" options={[100, 500, 1000]} value={loadLimit} onChange={setLoadLimit} format={(value) => String(value)} />
      </FilterGroup>

      <FilterGroup title="Levels">
        <div className="grid grid-cols-2 gap-1.5">
          {LEVELS.map((level) => <CheckboxRow checked={selectedLevels.includes(level)} key={level} label={level} onChange={() => toggleSelected(level, selectedLevels, setSelectedLevels)} />)}
        </div>
      </FilterGroup>

      <FilterGroup title="Modules">
        <div className="grid grid-cols-2 gap-1.5">
          {MODULES.map((module) => <CheckboxRow checked={selectedModules.includes(module)} key={module} label={module} onChange={() => toggleSelected(module, selectedModules, setSelectedModules)} />)}
        </div>
      </FilterGroup>

      <FilterGroup title="Time">
        <SegmentedOptions ariaLabel="Time range" options={['all', '1h', 'today', 'yesterday'] satisfies TimeFilter[]} value={timeFilter} onChange={setTimeFilter} format={formatTimeFilter} />
      </FilterGroup>

      <FilterGroup title="Behavior">
        <div className="grid gap-1.5">
          <CheckboxRow checked={liveMode} label="Live mode" onChange={() => setLiveMode(!liveMode)} />
          <CheckboxRow checked={autoScroll} disabled={!liveMode} label="Auto scroll" onChange={() => setAutoScroll(!autoScroll)} />
          <CheckboxRow checked={paused} disabled={!liveMode} label="Pause stream" onChange={() => setPaused(!paused)} />
        </div>
      </FilterGroup>

      <div className="flex items-center justify-between border-t border-dashboard-border-subtle/70 pt-3">
        <span className="text-caption text-dashboard-text-tertiary">Advanced filters</span>
        <Button onClick={onReset} size="sm" variant="ghost">Reset filters</Button>
      </div>
    </div>
  );
}

function FilterGroup({ children, title }: { children: ReactNode; title: string }) {
  return <section className="grid gap-2"><h2 className="text-caption font-semibold uppercase tracking-[0.16em] text-dashboard-text-tertiary">{title}</h2>{children}</section>;
}

function CheckboxRow({ checked, disabled = false, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange(): void }) {
  return (
    <label className={`flex min-h-7 items-center gap-2 rounded-lg px-2 py-1 text-caption transition ${disabled ? 'cursor-not-allowed text-dashboard-text-disabled' : 'cursor-pointer text-dashboard-text-secondary hover:bg-dashboard-bg-control/42 hover:text-dashboard-text-primary'}`}>
      <input checked={checked} className="h-3.5 w-3.5 accent-dashboard-accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring" disabled={disabled} onChange={onChange} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

function SegmentedOptions<T extends string | number>({ ariaLabel, format, onChange, options, value }: { ariaLabel: string; format(value: T): string; onChange(value: T): void; options: readonly T[]; value: T }) {
  return (
    <div aria-label={ariaLabel} className="flex flex-wrap gap-1" role="radiogroup">
      {options.map((option) => (
        <button aria-checked={value === option} className={`h-7 rounded-md border px-2.5 text-caption transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring ${value === option ? 'border-dashboard-accent-primary bg-dashboard-accent-muted text-dashboard-text-primary' : 'border-dashboard-border-subtle bg-dashboard-bg-control/38 text-dashboard-text-secondary hover:text-dashboard-text-primary'}`} key={String(option)} onClick={() => onChange(option)} role="radio" type="button">
          {format(option)}
        </button>
      ))}
    </div>
  );
}

function SummaryLine({ stats, visible }: { stats: Record<'INFO' | 'WARN' | 'ERROR' | 'DEBUG', number>; visible: number }) {
  return (
    <p className="px-0.5 text-caption text-dashboard-text-tertiary" aria-label={`${visible} visible logs. ${stats.INFO} info, ${stats.WARN} warn, ${stats.ERROR} error, ${stats.DEBUG} debug.`}>
      <span className="text-dashboard-success">{stats.INFO} Info</span>
      <span aria-hidden> • </span>
      <span className="text-dashboard-warning">{stats.WARN} Warn</span>
      <span aria-hidden> • </span>
      <span className="text-dashboard-danger">{stats.ERROR} Error</span>
      <span aria-hidden> • </span>
      <span className="text-dashboard-info">{stats.DEBUG} Debug</span>
    </p>
  );
}

function LogRow({ entry, onSelect }: { entry: DashboardLogEntry; onSelect(entry: DashboardLogEntry): void }) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(entry);
    }
  }

  return (
    <button className="grid w-full cursor-pointer gap-1.5 px-3 py-2 text-left transition hover:bg-dashboard-bg-surface-elevated/44 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-dashboard-focus-ring tablet:grid-cols-[5.25rem_4.75rem_7rem_1fr] tablet:items-start tablet:gap-0" onClick={() => onSelect(entry)} onKeyDown={handleKeyDown} type="button">
      <time className="font-mono text-[0.72rem] leading-5 text-dashboard-text-tertiary" dateTime={entry.timestamp}>{formatTime(entry.timestamp)}</time>
      <span className={`w-fit rounded-md border px-1.5 py-0.5 text-[0.65rem] font-bold leading-4 ${levelBadgeClass(entry.level)}`}>{entry.level}</span>
      <span className="truncate text-caption leading-5 text-dashboard-text-secondary">{entry.module}</span>
      <span className="min-w-0">
        <span className="block truncate text-caption font-medium leading-5 text-dashboard-text-primary">{entry.message}</span>
        {Object.keys(entry.summary).length ? <span className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[0.68rem] leading-4 text-dashboard-text-tertiary">{Object.entries(entry.summary).map(([key, value]) => <span key={key}>{key}={value}</span>)}</span> : null}
      </span>
    </button>
  );
}

function LogDrawer({ closeRef, entry, onClose }: { closeRef: React.RefObject<HTMLButtonElement | null>; entry: DashboardLogEntry; onClose(): void }) {
  return (
    <div className="fixed inset-0 z-drawer flex justify-end bg-black/52 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="log-details-title" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-dashboard-border-subtle bg-dashboard-bg-page p-4 shadow-elevation-3 tablet:p-5">
        <div className="flex items-start justify-between gap-3 border-b border-dashboard-border-subtle/70 pb-4">
          <div>
            <h2 className="text-heading-m" id="log-details-title">Log details</h2>
            <p className="mt-1 font-mono text-caption text-dashboard-text-tertiary">{entry.id}</p>
          </div>
          <button aria-label="Close log details" className="rounded-lg p-2 text-dashboard-text-secondary hover:bg-dashboard-bg-muted hover:text-dashboard-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring" onClick={onClose} ref={closeRef} type="button"><X className="h-4 w-4" /></button>
        </div>
        <dl className="mt-4 grid gap-2 text-small">
          {detailRows(entry).map(([label, value]) => <div className="grid gap-1 border-b border-dashboard-border-subtle/45 py-2 last:border-b-0" key={label}><dt className="text-caption uppercase tracking-[0.14em] text-dashboard-text-tertiary">{label}</dt><dd className="break-words text-dashboard-text-primary">{value || 'Unavailable'}</dd></div>)}
        </dl>
        <section className="mt-4 grid gap-3">
          <h3 className="text-small font-semibold">Metadata</h3>
          <pre className="max-h-72 overflow-auto rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-app/80 p-3 font-mono text-caption text-dashboard-text-secondary">{JSON.stringify(entry.metadata, null, 2)}</pre>
          <details className="rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-surface/54 p-3">
            <summary className="cursor-pointer text-small font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring">Raw JSON</summary>
            <pre className="mt-3 max-h-96 overflow-auto font-mono text-caption text-dashboard-text-secondary">{JSON.stringify(entry.raw, null, 2)}</pre>
          </details>
        </section>
      </aside>
    </div>
  );
}

function LogSkeleton() {
  return <div className="grid gap-0 p-3" aria-busy="true" role="status">{Array.from({ length: 12 }, (_, index) => <div className="grid gap-1.5 border-b border-dashboard-border-subtle/60 py-2.5" key={index}><Skeleton className="h-3 w-32" /><Skeleton className="h-4 w-8/12" /></div>)}</div>;
}

function EmptyLogs() {
  return <div className="grid gap-2 p-8 text-center"><h2 className="text-heading-m">No logs found</h2><p className="text-small text-dashboard-text-secondary">Clear filters, disable search, or enable live mode.</p></div>;
}

function ErrorState({ error, onRetry }: { error?: string; onRetry(): void }) {
  return <div className="grid gap-3 p-8"><h2 className="text-heading-m">Connection lost</h2><p className="text-small text-dashboard-text-secondary">{error ?? 'Logs could not be loaded.'}</p><Button className="w-fit" onClick={onRetry} variant="primary">Retry</Button></div>;
}

function toggleSelected<T>(value: T, current: T[], setValue: (value: T[]) => void) {
  setValue(current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]);
}

function boundedLogs(entries: DashboardLogEntry[]): DashboardLogEntry[] {
  const seen = new Set<string>();
  const unique = entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
  return unique.slice(0, MAX_RENDERED_LOGS);
}

function matchesFilters(entry: DashboardLogEntry, search: string, levels: DashboardLogLevel[], modules: string[], timeFilter: TimeFilter): boolean {
  if (levels.length && !levels.includes(entry.level)) return false;
  if (modules.length && !modules.includes(entry.module)) return false;
  const since = sinceFromFilter(timeFilter);
  if (since && Date.parse(entry.timestamp) < since) return false;
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [entry.message, entry.guildId, entry.userId, entry.username, entry.channel, entry.module, entry.event, entry.path, JSON.stringify(entry.summary)].filter(Boolean).join(' ').toLowerCase().includes(term);
}

function sinceFromFilter(filter: TimeFilter): number | undefined {
  const now = new Date();
  if (filter === '15m') return now.getTime() - 15 * 60_000;
  if (filter === '1h') return now.getTime() - 60 * 60_000;
  if (filter === '7d') return now.getTime() - 7 * 24 * 60 * 60_000;
  if (filter === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (filter === 'yesterday') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  return undefined;
}

function summarize(entries: DashboardLogEntry[]): Record<'INFO' | 'WARN' | 'ERROR' | 'DEBUG', number> {
  return entries.reduce((counts, entry) => {
    if (entry.level === 'INFO' || entry.level === 'WARN' || entry.level === 'ERROR' || entry.level === 'DEBUG') counts[entry.level] += 1;
    return counts;
  }, { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 });
}

function detailRows(entry: DashboardLogEntry): Array<[string, string | undefined]> {
  return [['Timestamp', new Date(entry.timestamp).toLocaleString()], ['Level', entry.level], ['Module', entry.module], ['Guild', entry.guildId], ['User', entry.username ?? entry.userId], ['Channel', entry.channel], ['Message', entry.message]];
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function levelBadgeClass(level: DashboardLogLevel): string {
  if (level === 'ERROR' || level === 'FATAL') return 'border-dashboard-danger/45 bg-dashboard-danger/10 text-dashboard-danger';
  if (level === 'WARN') return 'border-dashboard-warning/45 bg-dashboard-warning/10 text-dashboard-warning';
  if (level === 'DEBUG' || level === 'TRACE') return 'border-dashboard-info/45 bg-dashboard-info/10 text-dashboard-info';
  return 'border-dashboard-success/45 bg-dashboard-success/10 text-dashboard-success';
}

function formatTimeFilter(filter: TimeFilter): string {
  if (filter === '1h') return 'Last hour';
  if (filter === 'today') return 'Today';
  if (filter === 'yesterday') return 'Yesterday';
  if (filter === '15m') return 'Last 15m';
  if (filter === '7d') return 'Last 7d';
  return 'All';
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
