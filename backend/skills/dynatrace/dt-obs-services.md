# Application Services Skill (dt-obs-services)

Monitor application service performance, health, and Node.js runtime metrics using DQL.

## RED Metrics (Rate, Errors, Duration) — Primary Monitoring

Key metrics:
- `dt.service.request.response_time` — response time in **microseconds** (divide by 1000 for ms)
- `dt.service.request.count` — request count
- `dt.service.request.failure_count` — failed request count

```dql
timeseries {
  p95_ms = percentile(dt.service.request.response_time, 95, rollup: avg) / 1000,
  avg_ms = avg(dt.service.request.response_time) / 1000,
  requests = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count)
}, by: {dt.service.name}, from: now()-1h
| fieldsAdd error_rate_pct = (failures[] * 100.0) / requests[]
```

## Node.js Runtime Monitoring

Key metrics for Node.js services:
- `dt.process.node.event_loop.utilization` — event loop utilization (0-1)
- `dt.process.node.heap.used` — V8 heap used (bytes)
- `dt.process.node.heap.total` — V8 heap total (bytes)
- `dt.process.node.gc.duration` — GC collection time (ms)
- `dt.process.node.active_handles` — active I/O handles

```dql
timeseries {
  heap_used_mb = avg(dt.process.node.heap.used) / 1048576,
  heap_total_mb = avg(dt.process.node.heap.total) / 1048576,
  event_loop_util = avg(dt.process.node.event_loop.utilization) * 100
}, by: {dt.smartscape.service}, from: now()-30m
```

## SLA Compliance Check

```dql
fetch spans, from: now()-1h
| filter request.is_root_span == true
| fieldsAdd meets_sla = if(request.is_failed == false and duration < 5s, 1, else: 0)
| summarize total = count(), sla_ok = sum(meets_sla), by: {dt.service.name}
| fieldsAdd sla_pct = (sla_ok * 100.0) / total
| sort sla_pct asc
```

## Error Rate Alert Query

```dql
timeseries {
  requests = sum(dt.service.request.count),
  failures = sum(dt.service.request.failure_count)
}, by: {dt.service.name}, from: now()-15m
| fieldsAdd error_rate_pct = (failures[] * 100.0) / requests[]
| fieldsAdd is_alerting = arrayMax(error_rate_pct) > 5
| filter is_alerting == true
```

## Service Health Score

```dql
fetch spans, from: now()-30m
| filter request.is_root_span == true
| summarize
    total = count(),
    errors = countIf(request.is_failed == true),
    slow = countIf(duration > 3s),
    by: {dt.service.name}
| fieldsAdd
    error_rate = (errors * 100.0) / total,
    slow_rate = (slow * 100.0) / total,
    health_score = 100 - error_rate - (slow_rate / 2)
| sort health_score asc
```

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Response time values huge | Metric in microseconds | Divide by 1000 for ms |
| `dt.smartscape.service` shows ID not name | Need entity resolution | Use `getNodeName(dt.smartscape.service)` |
| Error rate always zero | Wrong metric | Use `dt.service.request.failure_count` |
| Node.js metrics missing | No OneAgent on process | Verify OneAgent instrumentation |

## WealthTrack-Specific Queries

```dql
// WealthTrack backend service health
timeseries {
  p95_ms = percentile(dt.service.request.response_time, 95, rollup: avg) / 1000,
  error_rate = sum(dt.service.request.failure_count) * 100.0 / sum(dt.service.request.count)
}, by: {dt.service.name},
filter: {matchesValue(dt.service.name, "*wealthtrack*") or matchesValue(dt.service.name, "*mcp*")},
from: now()-1h
```
