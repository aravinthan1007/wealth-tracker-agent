'use strict'

/**
 * Arize Phoenix OpenTelemetry tracing setup.
 * Sends every LLM call and tool invocation as a span to Phoenix.
 *
 * If PHOENIX_API_KEY is set → uses Arize cloud (app.phoenix.arize.com)
 * Otherwise              → uses local Phoenix instance (localhost:6006)
 */

const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node')
const { OTLPTraceExporter }  = require('@opentelemetry/exporter-trace-otlp-proto')
const { SimpleSpanProcessor, BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base')
const { resourceFromAttributes } = require('@opentelemetry/resources')
const { trace, SpanStatusCode, context, ROOT_CONTEXT } = require('@opentelemetry/api')

// OpenInference semantic conventions for AI spans
const SEMCONV = {
  LLM_MODEL_NAME:          'llm.model_name',
  LLM_INPUT_MESSAGES:      'llm.input_messages',
  LLM_OUTPUT_MESSAGES:     'llm.output_messages',
  LLM_TOKEN_COUNT_PROMPT:  'llm.token_count.prompt',
  LLM_TOKEN_COUNT_COMPLETION: 'llm.token_count.completion',
  INPUT_VALUE:             'input.value',
  INPUT_MIME_TYPE:         'input.mime_type',
  OUTPUT_VALUE:            'output.value',
  OUTPUT_MIME_TYPE:        'output.mime_type',
  OPENINFERENCE_SPAN_KIND: 'openinference.span.kind',
  TOOL_NAME:               'tool.name',
  TOOL_DESCRIPTION:        'tool.description',
  TOOL_PARAMETERS:         'tool.parameters',
}

let tracer = null

function initTracing() {
  const endpoint = process.env.PHOENIX_API_KEY
    ? (process.env.PHOENIX_COLLECTOR_ENDPOINT || 'https://app.phoenix.arize.com/v1/traces')
    : 'http://127.0.0.1:6006/v1/traces'

  const headers = {}
  if (process.env.PHOENIX_API_KEY) {
    headers['api_key'] = process.env.PHOENIX_API_KEY
  }
  if (process.env.PHOENIX_PROJECT) {
    headers['x-project-name'] = process.env.PHOENIX_PROJECT
  }

  const exporter = new OTLPTraceExporter({ url: endpoint, headers, timeoutMillis: 5000 })
  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({ 'service.name': 'wealthtrack-agent' }),
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  })
  provider.register()

  tracer = trace.getTracer('wealthtrack-agent', '1.0.0')
  console.log(`[tracing] Arize Phoenix → ${endpoint}`)
}

// Initialise if either Phoenix key or local Phoenix is configured
if (process.env.PHOENIX_API_KEY || process.env.PHOENIX_ENABLED === 'true') {
  try { initTracing() } catch (e) { console.warn('[tracing] init failed:', e.message) }
}

// ── Span helpers ──────────────────────────────────────────────────────────────

/**
 * Wraps an async function in an OpenTelemetry span.
 * Falls back to calling fn() directly if tracing not initialised.
 */
async function withSpan(name, kind, attrs, fn) {
  if (!tracer) return fn(null)

  const span = tracer.startSpan(name, {}, ROOT_CONTEXT)
  span.setAttributes({ 'openinference.span.kind': kind, ...attrs })
  try {
    const result = await fn(span)
    span.setStatus({ code: SpanStatusCode.OK })
    return result
  } catch (err) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
    span.recordException(err)
    throw err
  } finally {
    span.end()
  }
}

/**
 * Trace an LLM call (Gemini or Ollama).
 * @param {string} model   — model name (e.g. 'gemini-2.0-flash')
 * @param {Array}  messages — message array
 * @param {Function} callFn — async () => string (returns LLM text)
 */
async function traceLLMCall(model, messages, callFn) {
  return withSpan('llm.call', 'LLM', {
    [SEMCONV.LLM_MODEL_NAME]:     model,
    [SEMCONV.INPUT_VALUE]:        JSON.stringify(messages).slice(0, 4000),
    [SEMCONV.INPUT_MIME_TYPE]:    'application/json',
  }, async (span) => {
    const result = await callFn()
    if (span) {
      span.setAttribute(SEMCONV.OUTPUT_VALUE, String(result).slice(0, 4000))
      span.setAttribute(SEMCONV.OUTPUT_MIME_TYPE, 'text/plain')
    }
    return result
  })
}

/**
 * Trace a tool call.
 * @param {string} toolName — tool identifier
 * @param {any}    args     — tool arguments
 * @param {Function} callFn — async () => any (returns tool result)
 */
async function traceToolCall(toolName, args, callFn) {
  return withSpan(`tool.${toolName}`, 'TOOL', {
    [SEMCONV.TOOL_NAME]:       toolName,
    [SEMCONV.TOOL_PARAMETERS]: JSON.stringify(args || {}).slice(0, 1000),
    [SEMCONV.INPUT_VALUE]:     JSON.stringify(args || {}).slice(0, 1000),
  }, async (span) => {
    const result = await callFn()
    if (span) {
      span.setAttribute(SEMCONV.OUTPUT_VALUE, JSON.stringify(result).slice(0, 4000))
    }
    return result
  })
}

/**
 * Trace a full ReAct agent run.
 * @param {string} question — user question
 * @param {Function} callFn — async () => result
 */
async function traceAgentRun(question, callFn) {
  return withSpan('react.agent', 'AGENT', {
    [SEMCONV.INPUT_VALUE]:      question,
    [SEMCONV.INPUT_MIME_TYPE]:  'text/plain',
  }, async (span) => {
    const result = await callFn()
    if (span && result) {
      span.setAttribute(SEMCONV.OUTPUT_VALUE, String(result.answer || '').slice(0, 4000))
      span.setAttribute('agent.steps', result.steps?.length || 0)
      span.setAttribute('agent.tools_used', (result.toolsUsed || []).join(','))
      span.setAttribute('agent.model', result.model || '')
    }
    return result
  })
}

module.exports = { traceLLMCall, traceToolCall, traceAgentRun, SEMCONV }
