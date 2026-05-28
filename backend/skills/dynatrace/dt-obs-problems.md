# Problems & Alerts Skill (dt-obs-problems)

Investigate, query, and respond to Davis AI-detected problems in Dynatrace.

## Fetch Active Problems

```dql
fetch dt.davis.problems, from: now()-24h
| filter status == "OPEN"
| fields title, severityLevel, status, startTime, affectedEntities, managementZones
| sort startTime desc
```

## Problems by Severity

```dql
fetch dt.davis.problems, from: now()-7d
| summarize count(), by: {severityLevel, status}
| sort `count()` desc
```

## Problem Timeline

```dql
fetch dt.davis.problems, from: now()-7d
| makeTimeseries problems_count = count(), interval: 1h
| fields timeframe, problems_count
```

## MTTA / MTTR Analysis

```dql
fetch dt.davis.problems, from: now()-30d
| filter status == "CLOSED"
| fieldsAdd
    duration_min = (endTime - startTime) / 1m,
    acknowledged_min = if(isNotNull(ackTime), (ackTime - startTime) / 1m, else: null)
| summarize
    avg_duration_min = avg(duration_min),
    avg_ack_min = avg(acknowledged_min),
    total_problems = count(),
    by: {severityLevel}
```

## Davis Events for Root Cause

```dql
fetch dt.davis.events, from: now()-1h
| filter event.category == "PERFORMANCE"
| fields timestamp, title, event.category, affected_entity_names
| sort timestamp desc
```

## Smartscape Topology — Impacted Services

```dql
smartscapeNodes "SERVICE"
| filter matchesValue(dt.tags, "env:production")
| fields dt.smartscape.service, node.name, dt.tags
| limit 50
```

## Alert: Open HIGH/CRITICAL Problems

```dql
fetch dt.davis.problems, from: now()-1h
| filter status == "OPEN" and in(severityLevel, {"PERFORMANCE", "AVAILABILITY", "ERROR"})
| fields title, severityLevel, affectedEntities, startTime
| sort startTime desc
```

## WealthTrack Problem Investigation

```dql
// Check if any WealthTrack services have open problems
fetch dt.davis.problems, from: now()-24h
| filter status == "OPEN"
| filter matchesPhrase(title, "WealthTrack") or matchesPhrase(title, "wealth") or matchesPhrase(title, "mcp")
| fields title, severityLevel, startTime, status
| sort startTime desc
```

## Remediation Workflow

When a problem is detected:
1. Get problem details: `fetch dt.davis.problems | filter status == "OPEN"`
2. Check affected service metrics: `timeseries` for response time + error rate
3. Check recent logs: `fetch logs | filter loglevel == "ERROR"`
4. Check Davis events for root cause: `fetch dt.davis.events`
5. Document in handover report with timeline and resolution steps
