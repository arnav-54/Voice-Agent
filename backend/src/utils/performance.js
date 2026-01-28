export class PerformanceTracker {
    constructor() {
        this.timers = new Map();
    }

    start(label) {
        this.timers.set(label, Date.now());
    }

    stop(label) {
        const startTime = this.timers.get(label);
        if (!startTime) return 0;
        this.timers.delete(label);
        return Date.now() - startTime;
    }

    // Helper to get all metrics for a turn
    getTurnMetrics(startTime) {
        return {
            total: Date.now() - startTime,
            timestamp: new Date().toISOString()
        };
    }
}

export const turnPerformance = new PerformanceTracker();
