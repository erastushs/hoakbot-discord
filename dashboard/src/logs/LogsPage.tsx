import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AlertTriangle, Pause, Play, RotateCcw, X } from 'lucide-react';

import type { APIClient } from '../api/client.js';
import { Button, Card, Input, Skeleton, Switch } from '../components/index.js';
import type { DashboardLogEntry, DashboardLogLevel } from '../contracts.js';
import { PageHeader } from '../layout/PageHeader.js';

const LEVELS: DashboardLogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
const MODULES = ['Voice', 'Welcome', 'Goodbye', 'Logging', 'Moderation', 'Shrine', 'Security', 'Dashboard', 'API', 'Database', 'Scheduler'];
const QUICK_FILTERS = ['All', 'Live', 'Today', 'Errors', 'Warnings', 'Security', 'Voice', 'Commands', 'Moderation'] as const;
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

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

  const visibleLogs = useMemo(() => logs.filter((entry) => matchesFilters(entry, search, selectedLevels, selectedModules, timeFilter)), [logs, search, selectedLevels, selectedModules, timeFilter]);
  const stats = useMemo(() => summarize(visibleLogs), [visibleLogs]);

  function applyQuickFilter(filter: (typeof QUICK_FILTERS)[number]) {
    if (filter === 'All') {
      setSelectedLevels([]);
      setSelectedModules([]);
      setTimeFilter('all');
      setSearch('');
    } else if (filter === 'Live') {
      setLiveMode(true);
    } else if (filter === 'Today') {
      setTimeFilter('today');
    } else if (filter === 'Errors') {
      toggleSelected('ERROR', selectedLevels, setSelectedLevels);
    } else if (filter === 'Warnings') {
      toggleSelected('WARN', selectedLevels, setSelectedLevels);
    } else if (MODULES.includes(filter)) {
      toggleSelected(filter, selectedModules, setSelectedModules);
    } else if (filter === 'Commands') {
      setSearch('command');
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        actions={<ConnectionBadge connection={connection} liveMode={liveMode} />}
        description="Browse recent application logs, filter operational events, and monitor new entries without terminal access."
        title="Logs"
      />

      <Card className="grid gap-4 p-4 tablet:p-5">
        <div className="grid gap-3 desktop:grid-cols-[1fr_auto] desktop:items-end">
          <Input aria-label="Search logs" label="Search" onChange={(event) => setSearch(event.target.value)} placeholder="Search message, guild, user, channel, module, event, or path" value={search} />
          <div className="flex flex-wrap gap-2">
            <Button icon={<RotateCcw className="h-4 w-4" />} onClick={() => void loadLogs()} variant="secondary">Refresh</Button>
            <Button disabled={!nextCursor} onClick={() => void loadLogs(nextCursor)} variant="secondary">Load more</Button>
          </div>
        </div>

        <div aria-label="Quick log filters" className="flex flex-wrap gap-2" role="toolbar">
          {QUICK_FILTERS.map((filter) => (
            <button className="rounded-full border border-dashboard-border-subtle bg-dashboard-bg-control/54 px-3 py-1.5 text-caption font-medium text-dashboard-text-secondary transition hover:border-dashboard-accent-primary/50 hover:text-dashboard-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring" key={filter} onClick={() => applyQuickFilter(filter)} type="button">
              {filter}
            </button>
          ))}
        </div>

        <div className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
          <Switch checked={liveMode} description="Incoming logs appear automatically." label="Live mode" onCheckedChange={setLiveMode} />
          <Switch checked={autoScroll} description="Follow newest logs while live." disabled={!liveMode} label="Auto scroll" onCheckedChange={setAutoScroll} />
          <Button disabled={!liveMode} icon={paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} onClick={() => setPaused((current) => !current)} variant="secondary">
            {paused ? `Resume${bufferedLogs.length ? ` (${bufferedLogs.length})` : ''}` : 'Pause'}
          </Button>
          <select aria-label="Log history page size" className="h-10 rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-control/62 px-3 text-small text-dashboard-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring" onChange={(event) => setLoadLimit(Number(event.target.value))} value={loadLimit}>
            <option value={100}>Last 100</option>
            <option value={500}>Last 500</option>
            <option value={1000}>Last 1000</option>
          </select>
        </div>

        <Filters selectedLevels={selectedLevels} selectedModules={selectedModules} setSelectedLevels={setSelectedLevels} setSelectedModules={setSelectedModules} setTimeFilter={setTimeFilter} timeFilter={timeFilter} />
      </Card>

      <section className="grid gap-3 tablet:grid-cols-3 desktop:grid-cols-5" aria-label="Log summary">
        <StatCard label="INFO" value={stats.INFO} />
        <StatCard label="WARN" value={stats.WARN} />
        <StatCard label="ERROR" value={stats.ERROR} />
        <StatCard label="DEBUG" value={stats.DEBUG} />
        <StatCard label="Visible" value={visibleLogs.length} />
      </section>

      {connection === 'lost' ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashboard-warning/50 bg-dashboard-warning/10 p-4 text-small text-dashboard-text-primary" role="alert">
          <AlertTriangle className="h-4 w-4 text-dashboard-warning" />
          <span>Connection lost. Reconnecting automatically.</span>
          <Button onClick={() => setLiveMode(false)} size="sm" variant="secondary">Stop live</Button>
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        {status === 'loading' ? <LogSkeleton /> : status === 'error' ? <ErrorState error={error} onRetry={() => void loadLogs()} /> : visibleLogs.length === 0 ? <EmptyLogs /> : (
          <div className="max-h-[42rem] overflow-y-auto" role="region" aria-label="Log entries" tabIndex={0}>
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

function Filters({ selectedLevels, selectedModules, setSelectedLevels, setSelectedModules, setTimeFilter, timeFilter }: { selectedLevels: DashboardLogLevel[]; selectedModules: string[]; setSelectedLevels(value: DashboardLogLevel[]): void; setSelectedModules(value: string[]): void; setTimeFilter(value: TimeFilter): void; timeFilter: TimeFilter }) {
  return (
    <div className="grid gap-4 desktop:grid-cols-[1fr_1fr_auto]">
      <fieldset className="grid gap-2">
        <legend className="text-caption font-semibold uppercase tracking-[0.16em] text-dashboard-text-tertiary">Level</legend>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((level) => <Chip active={selectedLevels.includes(level)} key={level} label={level} onClick={() => toggleSelected(level, selectedLevels, setSelectedLevels)} />)}
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-caption font-semibold uppercase tracking-[0.16em] text-dashboard-text-tertiary">Module</legend>
        <div className="flex flex-wrap gap-2">
          {MODULES.map((module) => <Chip active={selectedModules.includes(module)} key={module} label={module} onClick={() => toggleSelected(module, selectedModules, setSelectedModules)} />)}
        </div>
      </fieldset>
      <label className="grid gap-2 text-caption font-semibold uppercase tracking-[0.16em] text-dashboard-text-tertiary">
        Time
        <select className="h-10 min-w-44 rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-control/62 px-3 text-small font-normal normal-case tracking-normal text-dashboard-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring" onChange={(event) => setTimeFilter(event.target.value as TimeFilter)} value={timeFilter}>
          <option value="all">All</option>
          <option value="15m">Last 15 minutes</option>
          <option value="1h">Last hour</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7d">Last 7 days</option>
        </select>
      </label>
    </div>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick(): void }) {
  return <button aria-pressed={active} className={`rounded-full border px-3 py-1.5 text-caption font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring ${active ? 'border-dashboard-accent-primary bg-dashboard-accent-muted text-dashboard-text-primary' : 'border-dashboard-border-subtle bg-dashboard-bg-control/45 text-dashboard-text-secondary hover:text-dashboard-text-primary'}`} onClick={onClick} type="button">{label}</button>;
}

function LogRow({ entry, onSelect }: { entry: DashboardLogEntry; onSelect(entry: DashboardLogEntry): void }) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(entry);
    }
  }

  return (
    <button className="grid w-full cursor-pointer gap-2 p-4 text-left transition hover:bg-dashboard-bg-surface-elevated/56 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-dashboard-focus-ring tablet:grid-cols-[5.5rem_4.5rem_7rem_1fr] tablet:items-start" onClick={() => onSelect(entry)} onKeyDown={handleKeyDown} type="button">
      <time className="font-mono text-caption text-dashboard-text-tertiary" dateTime={entry.timestamp}>{formatTime(entry.timestamp)}</time>
      <span className={`text-caption font-bold ${levelClass(entry.level)}`}>{entry.level}</span>
      <span className="text-small font-medium text-dashboard-text-secondary">{entry.module}</span>
      <span className="grid gap-1">
        <span className="text-small font-medium text-dashboard-text-primary">{entry.message}</span>
        {Object.keys(entry.summary).length ? <span className="flex flex-wrap gap-2 font-mono text-caption text-dashboard-text-tertiary">{Object.entries(entry.summary).map(([key, value]) => <span key={key}>{key}={value}</span>)}</span> : null}
      </span>
    </button>
  );
}

function LogDrawer({ closeRef, entry, onClose }: { closeRef: React.RefObject<HTMLButtonElement | null>; entry: DashboardLogEntry; onClose(): void }) {
  return (
    <div className="fixed inset-0 z-drawer flex justify-end bg-black/58 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="log-details-title" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-dashboard-border-subtle bg-dashboard-bg-page p-5 shadow-elevation-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-heading-m" id="log-details-title">Log details</h2>
            <p className="mt-1 font-mono text-caption text-dashboard-text-tertiary">{entry.id}</p>
          </div>
          <button aria-label="Close log details" className="rounded-lg p-2 text-dashboard-text-secondary hover:bg-dashboard-bg-muted hover:text-dashboard-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring" onClick={onClose} ref={closeRef} type="button"><X className="h-4 w-4" /></button>
        </div>
        <dl className="mt-6 grid gap-3 text-small">
          {detailRows(entry).map(([label, value]) => <div className="grid gap-1 rounded-lg bg-dashboard-bg-surface/64 p-3" key={label}><dt className="text-caption uppercase tracking-[0.14em] text-dashboard-text-tertiary">{label}</dt><dd className="break-words text-dashboard-text-primary">{value || 'Unavailable'}</dd></div>)}
        </dl>
        <section className="mt-5 grid gap-3">
          <h3 className="text-small font-semibold">Metadata</h3>
          <pre className="max-h-72 overflow-auto rounded-xl border border-dashboard-border-subtle bg-dashboard-bg-app/80 p-3 font-mono text-caption text-dashboard-text-secondary">{JSON.stringify(entry.metadata, null, 2)}</pre>
          <details className="rounded-xl border border-dashboard-border-subtle bg-dashboard-bg-surface/54 p-3">
            <summary className="cursor-pointer text-small font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring">Raw JSON</summary>
            <pre className="mt-3 max-h-96 overflow-auto font-mono text-caption text-dashboard-text-secondary">{JSON.stringify(entry.raw, null, 2)}</pre>
          </details>
        </section>
      </aside>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return <Card className="p-4"><p className="text-caption font-semibold uppercase tracking-[0.16em] text-dashboard-text-tertiary">{label}</p><p className="mt-2 text-heading-m text-dashboard-text-primary">{value}</p></Card>;
}

function ConnectionBadge({ connection, liveMode }: { connection: ConnectionState; liveMode: boolean }) {
  const label = liveMode ? connection : 'history only';
  return <span className="rounded-full border border-dashboard-border-subtle bg-dashboard-bg-control/62 px-3 py-1.5 text-caption font-medium uppercase tracking-[0.12em] text-dashboard-text-secondary">{label}</span>;
}

function LogSkeleton() {
  return <div className="grid gap-0 p-4" aria-busy="true" role="status">{Array.from({ length: 8 }, (_, index) => <div className="grid gap-2 border-b border-dashboard-border-subtle/60 py-4" key={index}><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-8/12" /><Skeleton className="h-3 w-5/12" /></div>)}</div>;
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

function levelClass(level: DashboardLogLevel): string {
  if (level === 'ERROR' || level === 'FATAL') return 'text-dashboard-danger';
  if (level === 'WARN') return 'text-dashboard-warning';
  if (level === 'DEBUG' || level === 'TRACE') return 'text-dashboard-info';
  return 'text-dashboard-success';
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
