# DQL Essentials Skill

DQL is a pipeline-based query language. Queries chain commands with `|` to filter, transform, and aggregate data. DQL has unique syntax that differs from SQL — load this skill before writing any DQL query.

## Core Syntax

```dql
fetch logs, from: now()-1h
| filter loglevel == "ERROR"
| summarize count(), by: {k8s.namespace.name}
| sort `count()` desc
| limit 10
```

## Fetch Commands → Data Models

| Fetch Command | Data Model | Key Fields |
|---|---|---|
| `fetch logs` | Log events | `content` (message), `loglevel`, `k8s.*`, `host.*` |
| `fetch spans` | Distributed tracing | `span.*`, `service.*`, `http.*`, `duration` |
| `fetch events` | DAVIS / infra events | `event.*`, `dt.smartscape.*` |
| `fetch dt.davis.problems` | Davis problems | problem details |
| `timeseries avg(metric.key)` | Metrics | NOT fetch — use `timeseries` command |
| `smartscapeNodes "HOST"` | Topology | NOT fetch — types: HOST, SERVICE, PROCESS |

## Key Commands

- `fetch` — load data
- `filter` / `filterOut` — filter rows
- `fields` / `fieldsAdd` / `fieldsRemove` — select/add/remove columns
- `summarize` — aggregate (GROUP BY)
- `sort` — order results
- `limit` — cap row count
- `timeseries` — metrics time-series queries
- `makeTimeseries` — build time-series from event data

## Syntax Pitfalls (common mistakes)

| Wrong | Right | Issue |
|---|---|---|
| `filter field in ["a","b"]` | `filter in(field, {"a","b"})` | `[]` wraps sub-queries; use `{}` for static arrays |
| `filter host = "A"` | `filter host == "A"` | DQL uses `==` not `=` for equality |
| `filter log.level == "ERROR"` | `filter loglevel == "ERROR"` | Log severity is `loglevel`, no dot |
| `contains(lower(field), "err")` | `contains(field, "err", false)` | Use third param for case-insensitive |
| `metrics dt.host.cpu.usage` | `timeseries avg(dt.host.cpu.usage)` | `metrics` = metadata, `timeseries` = values |
| `by: severity, status` | `by: {severity, status}` | `by:` requires `{}` |
| `toLowercase(field)` | `lower(field)` | Function is `lower()` |
| `sort count() desc` | `` sort `count()` desc `` | Backtick special-char field names |
| `dt.entity.host` | `dt.smartscape.host` | `dt.entity.*` is deprecated |
| `filter matchesValue(name, "*serv*9*")` | `filter matchesValue(name, "*serv*") and matchesValue(name, "*9*")` | `matchesValue` wildcard only at start/end |

## Entity Fields

| Entity | ID field | `smartscapeNodes` type |
|---|---|---|
| Host | `dt.smartscape.host` | `"HOST"` |
| Service | `dt.smartscape.service` | `"SERVICE"` |
| Process | `dt.smartscape.process` | `"PROCESS"` |
| K8s cluster | `dt.smartscape.k8s_cluster` | `"K8S_CLUSTER"` |

## Timeseries Queries

```dql
timeseries {
  p95 = percentile(dt.service.request.response_time, 95, rollup: avg),
  avg_rt = avg(dt.service.request.response_time),
  requests = sum(dt.service.request.count)
}, by: {dt.service.name}, from: now()-1h
```

`rollup:` is **required** for `percentile`, `median`, `percentRank` — omitting it returns no results.

## Time Alignment (@)

```dql
from: now()-1h@h    // last hour, aligned to hour boundary
from: now()-1d@d    // yesterday, aligned to midnight
from: now()@M       // this month so far
```

Order: offset FIRST, then align: `now()-2h@h` not `now()@h-2h`

## Metric Discovery

```dql
metrics
| filter contains(metric.key, "node")
| summarize count(), by: {metric.key}
```

## Common Patterns

### Error rate over time
```dql
fetch logs, from: now()-1h
| makeTimeseries {
    total = count(),
    errors = countIf(loglevel == "ERROR")
  }, interval: 5m, by: {k8s.namespace.name}
| fieldsAdd error_rate = errors[] * 100.0 / total[]
```

### Service response time
```dql
timeseries p95_ms = percentile(dt.service.request.response_time, 95, rollup: avg) / 1000,
  by: {dt.service.name}, from: now()-30m
```

### Log search with full-text
```dql
fetch logs, from: now()-1h
| filter matchesPhrase(content, "timeout") or matchesPhrase(content, "ECONNREFUSED")
| fields timestamp, loglevel, k8s.pod.name, content
| sort timestamp desc
| limit 50
```
