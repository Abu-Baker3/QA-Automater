import {
  trace,
  context,
  propagation,
  Span,
  SpanStatusCode,
  SpanKind,
  TextMapSetter,
  TextMapGetter,
  metrics,
  Counter,
  Histogram,
} from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

let sdkInstance: NodeSDK | null = null;
const counterCache = new Map<string, Counter>();
const histogramCache = new Map<string, Histogram>();

export interface TelemetryConfig {
  serviceName: string;
  disabled?: boolean;
}

/**
 * Initializes the OpenTelemetry Node SDK for a service (API or Worker).
 */
export function initTelemetry(serviceNameOrConfig: string | TelemetryConfig): NodeSDK | null {
  const config: TelemetryConfig =
    typeof serviceNameOrConfig === 'string'
      ? { serviceName: serviceNameOrConfig }
      : serviceNameOrConfig;

  const isDisabled =
    config.disabled || process.env.OTEL_SDK_DISABLED === 'true' || process.env.NODE_ENV === 'test';

  if (isDisabled) {
    return null;
  }

  if (sdkInstance) {
    return sdkInstance;
  }

  try {
    const resource = new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
    });

    sdkInstance = new NodeSDK({
      resource,
    });

    sdkInstance.start();

    process.on('SIGTERM', () => {
      sdkInstance
        ?.shutdown()
        .then(() => console.log('OTel SDK shutdown complete'))
        .catch((err) => console.error('Error shutting down OTel SDK', err));
    });

    return sdkInstance;
  } catch (err) {
    console.warn(`[OTel] Failed to initialize OpenTelemetry SDK for ${config.serviceName}:`, err);
    return null;
  }
}

/**
 * Custom getter/setter for injecting/extracting OTel W3C context into plain JS objects (e.g. BullMQ job data)
 */
const plainObjectSetter: TextMapSetter<Record<string, unknown>> = {
  set(carrier, key, value) {
    carrier[key] = value;
  },
};

const plainObjectGetter: TextMapGetter<Record<string, unknown>> = {
  keys(carrier) {
    return Object.keys(carrier);
  },
  get(carrier, key) {
    const val = carrier[key];
    return typeof val === 'string' ? val : Array.isArray(val) ? val[0] : undefined;
  },
};

/**
 * Injects the active trace context into a carrier object (e.g. BullMQ job payload)
 */
export function injectTraceContext<T extends Record<string, unknown>>(
  data: T,
): T & { traceparent?: string; tracestate?: string } {
  const carrier: Record<string, unknown> = { ...data };
  propagation.inject(context.active(), carrier, plainObjectSetter);
  return carrier as T & { traceparent?: string; tracestate?: string };
}

/**
 * Extracts trace context from a carrier object and executes the callback within that trace context.
 */
export function withExtractedTraceContext<R>(carrier: Record<string, unknown>, fn: () => R): R {
  const extractedContext = propagation.extract(context.active(), carrier, plainObjectGetter);
  return context.with(extractedContext, fn);
}

/**
 * Wraps execution inside an OTel trace span with automatic status handling & error recording.
 */
export async function withSpan<T>(
  tracerName: string,
  spanName: string,
  fn: (span: Span) => Promise<T>,
  options?: { kind?: SpanKind; attributes?: Record<string, string | number | boolean> },
): Promise<T> {
  const tracer = trace.getTracer(tracerName);
  return tracer.startActiveSpan(
    spanName,
    { kind: options?.kind ?? SpanKind.INTERNAL, attributes: options?.attributes },
    async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

/**
 * Records a counter metric (e.g., job counts, error counts)
 */
export function incrementCounter(
  meterName: string,
  counterName: string,
  value = 1,
  attributes?: Record<string, string | number>,
): void {
  try {
    const meter = metrics.getMeter(meterName);
    let counter = counterCache.get(`${meterName}:${counterName}`);
    if (!counter) {
      counter = meter.createCounter(counterName);
      counterCache.set(`${meterName}:${counterName}`, counter);
    }
    counter.add(value, attributes);
  } catch {
    // Ignore metrics failures if meter uninitialized
  }
}

/**
 * Records a histogram metric (e.g., job processing duration)
 */
export function recordHistogram(
  meterName: string,
  histogramName: string,
  value: number,
  attributes?: Record<string, string | number>,
): void {
  try {
    const meter = metrics.getMeter(meterName);
    let histogram = histogramCache.get(`${meterName}:${histogramName}`);
    if (!histogram) {
      histogram = meter.createHistogram(histogramName);
      histogramCache.set(`${meterName}:${histogramName}`, histogram);
    }
    histogram.record(value, attributes);
  } catch {
    // Ignore metrics failures if meter uninitialized
  }
}

export * from './alerting';
