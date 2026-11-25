/**
 * Constantes y clasificador físico de telemetría óptica GPON / XGS-PON (FTTH)
 */
export class OpticalTelemetryClassifier {
    static OPTIMAL_MIN_DBM = -24.50;
    static WARNING_MIN_DBM = -27.99;
    static MASS_OUTAGE_THRESHOLD = 3;

    static evaluateRxPower(rxPowerDbm) {
        const rx = Number(rxPowerDbm);
        if (Number.isNaN(rx)) {
            return {
                onuStatus: 'offline',
                opticalHealth: 'critical',
                txPowerDbm: 0.00,
                latencyMs: 999,
                packetLossPct: 100.00,
                label: 'SIN TELEMETRÍA'
            };
        }

        if (rx >= OpticalTelemetryClassifier.OPTIMAL_MIN_DBM) {
            return {
                onuStatus: 'online',
                opticalHealth: 'optimal',
                txPowerDbm: 2.25,
                latencyMs: 6,
                packetLossPct: 0.00,
                label: 'ÓPTIMO'
            };
        }

        if (rx >= OpticalTelemetryClassifier.WARNING_MIN_DBM) {
            return {
                onuStatus: 'high_attenuation',
                opticalHealth: 'warning',
                txPowerDbm: 1.90,
                latencyMs: 45,
                packetLossPct: 4.80,
                label: 'ATENUACIÓN ALTA'
            };
        }

        return {
            onuStatus: 'los',
            opticalHealth: 'critical',
            txPowerDbm: 0.00,
            latencyMs: 999,
            packetLossPct: 100.00,
            label: 'PÉRDIDA DE SEÑAL (LOS)'
        };
    }
}
