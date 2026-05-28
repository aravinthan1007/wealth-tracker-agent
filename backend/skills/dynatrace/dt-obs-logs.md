# Observability Logs Skill (dt-obs-logs)

Query, analyze, and alert on application logs using DQL fetch logs.

## Basic Log Queries

```dql
// All errors in last hour
fetch logs, from: now()-1h
| filter loglevel == "ERROR"
| fields timestamp, loglevel, k8s.pod.name, k8s.namespace.name, content
| sort timestamp desc
| limit 100
```

## Log Field Reference

| Field | Description |
|---|---|
| `content` | Log message body (full-text searchable) |
| `loglevel` | Severity: `ERROR`, `WARN`, `INFO`, `DEBUG` (NOT `log.level`) |
| `k8s.pod.name` | Pod name (Kubernetes) |
| `k8s.namespace.name` | Namespace |
| `k8s.container.name` | Container name |
| `host.name` | Host for non-K8s |
| `dt.smartscape.service` | Associated service entity |
| `timestamp` | Log timestamp |

## Error Rate Trend

```dql
fetch logs, from: now()-2h
| makeTimeseries {
    total = count(),
    errors = countIf(loglevel == "ERROR"),
    warns = countIf(loglevel == "WARN")
  }, interval: 5m, by: {k8s.namespace.name}
| fieldsAdd error_rate_pct = errors[] * 100.0 / total[]
```

## Full-Text Search

```dql
fetch logs, from: now()-1h
| filter matchesPhrase(content, "ECONNREFUSED") or matchesPhrase(content, "timeout")
| fields timestamp, loglevel, k8s.pod.name, content
| sort timestamp desc
```

## Exception / Stack Trace Detection

```dql
fetch logs, from: now()-1h
| filter loglevel == "ERROR" and (matchesPhrase(content, "Error:") or matchesPhrase(content, "Exception"))
| summarize error_count = count(), by: {k8s.container.name, content}
| sort error_count desc
| limit 20
```

## Log Volume by Service

```dql
fetch logs, from: now()-1h
| summarize count(), by: {k8s.namespace.name, loglevel}
| sort `count()` desc
```

## WealthTrack-Specific Log Queries

```dql
// Gemini API failures
fetch logs, from: now()-1h
| filter matchesPhrase(content, "Gemini") and loglevel == "ERROR"
| fields timestamp, content, k8s.pod.name
| sort timestamp desc

// Agent tool errors
fetch logs, from: now()-1h
| filter matchesPhrase(content, "tool") and (loglevel == "ERROR" or loglevel == "WARN")
| fields timestamp, content
| sort timestamp desc

// Yahoo Finance timeouts
fetch logs, from: now()-1h
| filter matchesPhrase(content, "Yahoo") or matchesPhrase(content, "AbortError")
| fields timestamp, loglevel, content
| sort timestamp desc

// MCP communication logs
fetch logs, from: now()-1h
| filter matchesPhrase(content, "mcp") or matchesPhrase(content, "MCP")
| fields timestamp, loglevel, content
| sort timestamp desc
```

## Alert: Error Spike Detection

```dql
fetch logs, from: now()-15m
| makeTimeseries {errors = countIf(loglevel == "ERROR")}, interval: 1m
| fieldsAdd spike = arrayMax(errors) > 10
| filter spike == true
```
