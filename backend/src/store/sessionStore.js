/**
 * In-Memory LRU-Bounded Session Telemetry Store
 *
 * Aggregates incoming WebSocket telemetry packets per sessionId over time,
 * computes running averages, tracks per-field friction hotspots, and retains
 * bounded historical time-series samples for GET /api/sessions/:sessionId/metrics.
 */

export function createSessionStore({
  maxSessions = 500,
  maxHistoryPerSession = 200
} = {}) {
  const sessions = new Map();

  function touchSessionLru(sessionId, sessionRecord) {
    // Re-insert in Map to mark as most-recently-used
    if (sessions.has(sessionId)) {
      sessions.delete(sessionId);
    }
    sessions.set(sessionId, sessionRecord);

    // Evict least-recently-used session if capacity exceeded
    if (sessions.size > maxSessions) {
      const oldestKey = sessions.keys().next().value;
      if (oldestKey !== undefined) {
        sessions.delete(oldestKey);
      }
    }
  }

  function getOrCreateSession(sessionId, timestamp) {
    const existing = sessions.get(sessionId);
    if (existing) {
      touchSessionLru(sessionId, existing);
      return existing;
    }

    const fresh = {
      sessionId,
      createdAt: timestamp,
      lastUpdatedAt: timestamp,
      packetCount: 0,
      thresholdBreaches: 0,
      generatedComponentsCount: 0,
      lastGeneratedAt: null,
      peakInstantScore: 0,
      peakRollingScore: 0,
      sums: {
        instantScore: 0,
        rollingAverageScore: 0,
        mouseVelocity: 0,
        hesitationMs: 0
      },
      latest: null,
      fieldStats: {},
      lastFormStateSnapshot: null,
      history: []
    };

    touchSessionLru(sessionId, fresh);
    return fresh;
  }

  /**
   * Aggregates a validated telemetry packet into the session's store.
   */
  function recordTelemetry(telemetry, threshold = 70) {
    const {
      sessionId,
      timestamp,
      metrics,
      instantScore,
      rollingAverageScore,
      activeFieldId,
      cursor,
      formStateSnapshot
    } = telemetry;

    const record = getOrCreateSession(sessionId, timestamp);
    record.lastUpdatedAt = timestamp;
    record.packetCount += 1;

    if (rollingAverageScore >= threshold) {
      record.thresholdBreaches += 1;
    }

    record.peakInstantScore = Math.max(record.peakInstantScore, instantScore);
    record.peakRollingScore = Math.max(record.peakRollingScore, rollingAverageScore);

    record.sums.instantScore += instantScore;
    record.sums.rollingAverageScore += rollingAverageScore;
    record.sums.mouseVelocity += metrics.mouseVelocity;
    record.sums.hesitationMs += metrics.hesitationMs;

    record.latest = {
      timestamp,
      activeFieldId: activeFieldId || "none",
      instantScore,
      rollingAverageScore,
      metrics,
      cursor: cursor || null
    };

    if (formStateSnapshot) {
      record.lastFormStateSnapshot = formStateSnapshot;
    }

    // Aggregate per-field friction stats
    const fieldKey = activeFieldId || "unfocused";
    if (!record.fieldStats[fieldKey]) {
      record.fieldStats[fieldKey] = {
        samples: 0,
        maxRollingScore: 0,
        maxHesitationMs: 0,
        maxRageClicks: 0,
        totalInstantScore: 0
      };
    }

    const fs = record.fieldStats[fieldKey];
    fs.samples += 1;
    fs.maxRollingScore = Math.max(fs.maxRollingScore, rollingAverageScore);
    fs.maxHesitationMs = Math.max(fs.maxHesitationMs, metrics.hesitationMs);
    fs.maxRageClicks = Math.max(fs.maxRageClicks, metrics.rageClicks);
    fs.totalInstantScore += instantScore;

    // Append bounded historical entry
    record.history.push({
      timestamp,
      activeFieldId: fieldKey,
      instantScore,
      rollingAverageScore,
      mouseVelocity: metrics.mouseVelocity,
      hesitationMs: metrics.hesitationMs,
      rageClicks: metrics.rageClicks,
      clickErrorRate: metrics.clickErrorRate,
      cursor: cursor || null
    });

    if (record.history.length > maxHistoryPerSession) {
      record.history.shift();
    }

    return record;
  }

  /**
   * Records a component generation event for a session.
   */
  function recordComponentGeneration(sessionId, { activeFieldId, score, codeLength }) {
    const record = getOrCreateSession(sessionId, Date.now());
    record.generatedComponentsCount += 1;
    record.lastGeneratedAt = Date.now();
    record.lastGenerationTrigger = {
      activeFieldId,
      score,
      codeLength,
      triggeredAt: record.lastGeneratedAt
    };
  }

  /**
   * Returns aggregated metrics + historical series for GET /api/sessions/:sessionId/metrics.
   */
  function getSessionMetrics(sessionId) {
    const record = sessions.get(sessionId);
    if (!record) return null;

    const count = Math.max(1, record.packetCount);

    const fieldFrictionBreakdown = Object.entries(record.fieldStats).map(
      ([fieldId, stats]) => ({
        fieldId,
        samples: stats.samples,
        avgInstantScore: Math.round(stats.totalInstantScore / Math.max(1, stats.samples)),
        maxRollingScore: stats.maxRollingScore,
        maxHesitationMs: stats.maxHesitationMs,
        maxRageClicks: stats.maxRageClicks
      })
    );

    // Sort hotspots by maxRollingScore descending
    fieldFrictionBreakdown.sort((a, b) => b.maxRollingScore - a.maxRollingScore);

    return {
      sessionId: record.sessionId,
      createdAt: record.createdAt,
      lastUpdatedAt: record.lastUpdatedAt,
      summary: {
        packetCount: record.packetCount,
        thresholdBreaches: record.thresholdBreaches,
        generatedComponentsCount: record.generatedComponentsCount,
        lastGeneratedAt: record.lastGeneratedAt,
        peakInstantScore: record.peakInstantScore,
        peakRollingScore: record.peakRollingScore,
        averages: {
          instantScore: Number((record.sums.instantScore / count).toFixed(2)),
          rollingAverageScore: Number((record.sums.rollingAverageScore / count).toFixed(2)),
          mouseVelocity: Number((record.sums.mouseVelocity / count).toFixed(2)),
          hesitationMs: Math.round(record.sums.hesitationMs / count)
        }
      },
      latest: record.latest,
      fieldFrictionBreakdown,
      lastFormStateSnapshot: record.lastFormStateSnapshot,
      history: record.history
    };
  }

  /**
   * Lists active sessions (most recently updated first).
   */
  function listSessions() {
    return Array.from(sessions.values())
      .reverse()
      .map((s) => ({
        sessionId: s.sessionId,
        packetCount: s.packetCount,
        peakRollingScore: s.peakRollingScore,
        thresholdBreaches: s.thresholdBreaches,
        generatedComponentsCount: s.generatedComponentsCount,
        lastUpdatedAt: s.lastUpdatedAt
      }));
  }

  return {
    recordTelemetry,
    recordComponentGeneration,
    getSessionMetrics,
    listSessions,
    get size() {
      return sessions.size;
    }
  };
}

