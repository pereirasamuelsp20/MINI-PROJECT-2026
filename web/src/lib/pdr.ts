/**
 * Pedestrian Dead Reckoning (PDR) & 2D Extended Kalman Filter
 * 
 * Strategy:
 * 1. Default to pure GPS whenever a fresh satellite lock exists (within 8 seconds).
 *    In GPS mode, exact hardware coordinates and accuracy are used with zero mathematical drift.
 * 2. Only engage PDR + Kalman Filter dead reckoning when GPS signal is lost
 *    (indoor facilities, basements, tunnels, or urban canyon signal dropouts).
 * 3. When GPS lock returns, immediately re-anchor the Kalman state to the true GPS fix.
 */

export interface LocationEstimate {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  source: 'gps' | 'pdr' | 'kalman_fused';
  headingDegrees: number | null;
  speedMps: number | null;
  stepCount: number;
  lastGpsFixTime: number | null;
  isGpsLost: boolean;
  timestamp: number;
}

export type LocationListener = (estimate: LocationEstimate) => void;

// Simple 2D Kalman Filter state [x, y, vx, vy] in local meters relative to datum
class Kalman2D {
  // State: [x, y, vx, vy]
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;

  // Covariance matrix (diagonal approximations)
  public p_pos: number = 25; // pos variance (m^2)
  public p_vel: number = 2;  // vel variance ((m/s)^2)

  // Process noise
  private q_pos: number = 0.5; // (m^2/s)
  private q_vel: number = 1.0; // ((m/s)^2/s)

  public predict(dtSeconds: number, pdrDx: number = 0, pdrDy: number = 0) {
    if (dtSeconds <= 0) return;

    if (pdrDx !== 0 || pdrDy !== 0) {
      // Step-driven prediction
      this.x += pdrDx;
      this.y += pdrDy;
      this.vx = pdrDx / Math.max(dtSeconds, 0.3);
      this.vy = pdrDy / Math.max(dtSeconds, 0.3);
      // PDR step uncertainty accumulation
      this.p_pos += 1.5;
    } else {
      // Kinematic drift prediction
      this.x += this.vx * dtSeconds;
      this.y += this.vy * dtSeconds;
      this.p_pos += this.q_pos * dtSeconds;
      this.p_vel += this.q_vel * dtSeconds;
    }
  }

  public reset(accuracyMeters: number = 15) {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.p_pos = accuracyMeters * accuracyMeters;
  }
}

export class PDRKalmanTracker {
  private kalman: Kalman2D = new Kalman2D();
  private originLat: number;
  private originLng: number;
  private hasOrigin: boolean = false;

  // Raw GPS state
  private lastGpsLat: number;
  private lastGpsLng: number;
  private lastGpsTimestamp: number = 0;
  private lastGpsAccuracy: number = 20;

  private lastUpdateTimestamp: number = Date.now();

  // Orientation & Compass
  private currentHeading: number | null = null; // degrees from true North

  // Step detection
  private stepCount: number = 0;
  private defaultStrideLength: number = 0.74; // meters per stride
  private accelWindow: number[] = [];
  private lastStepTimestamp: number = 0;
  private isStepPeakDetected: boolean = false;

  // Listeners
  private listeners: Set<LocationListener> = new Set();
  private isRunning: boolean = false;
  private periodicInterval: any = null;

  constructor(initialLat: number = 19.076, initialLng: number = 72.8777) {
    this.originLat = initialLat;
    this.originLng = initialLng;
    this.lastGpsLat = initialLat;
    this.lastGpsLng = initialLng;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastUpdateTimestamp = Date.now();

    if (typeof window !== 'undefined') {
      window.addEventListener('devicemotion', this.handleDeviceMotion, true);
      window.addEventListener('deviceorientation', this.handleDeviceOrientation, true);
    }

    // Periodic check to detect GPS loss or evaluate dead reckoning
    this.periodicInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  public stop() {
    this.isRunning = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.handleDeviceMotion, true);
      window.removeEventListener('deviceorientation', this.handleDeviceOrientation, true);
    }
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
      this.periodicInterval = null;
    }
  }

  public onUpdate(callback: LocationListener): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Feed a new raw GPS observation directly from hardware GPS.
   * Whenever GPS is available, it is the authoritative source of truth.
   */
  public updateGPS(lat: number, lng: number, accuracyMeters: number = 15) {
    const now = Date.now();
    this.lastUpdateTimestamp = now;
    this.lastGpsTimestamp = now;
    this.lastGpsAccuracy = accuracyMeters;
    this.lastGpsLat = lat;
    this.lastGpsLng = lng;

    // Anchor dead reckoning origin to this exact GPS fix
    this.originLat = lat;
    this.originLng = lng;
    this.hasOrigin = true;
    this.kalman.reset(accuracyMeters);

    this.emit('gps');
  }

  /**
   * Check if GPS lock is currently active (< 8 seconds since last fix)
   */
  public hasGPSLock(): boolean {
    if (!this.lastGpsTimestamp) return false;
    return Date.now() - this.lastGpsTimestamp < 8000;
  }

  /**
   * Device motion handler for peak detection step counting.
   * Only propagates dead reckoning position if GPS is actually lost.
   */
  private handleDeviceMotion = (event: DeviceMotionEvent) => {
    const accel = event.accelerationIncludingGravity || event.acceleration;
    if (!accel) return;

    const ax = accel.x ?? 0;
    const ay = accel.y ?? 0;
    const az = accel.z ?? 0;

    const mag = Math.sqrt(ax * ax + ay * ay + az * az);
    this.accelWindow.push(mag);
    if (this.accelWindow.length > 5) this.accelWindow.shift();

    const smoothed = this.accelWindow.reduce((a, b) => a + b, 0) / this.accelWindow.length;
    const now = Date.now();
    const thresholdHigh = 11.0;
    const thresholdLow = 8.5;

    // Detect pedestrian step peak
    if (!this.isStepPeakDetected && smoothed > thresholdHigh) {
      if (now - this.lastStepTimestamp > 280) {
        this.isStepPeakDetected = true;
      }
    } else if (this.isStepPeakDetected && smoothed < thresholdLow) {
      this.isStepPeakDetected = false;
      this.lastStepTimestamp = now;
      this.onStepDetected();
    }
  };

  /**
   * Device orientation handler for compass bearing
   */
  private handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    const evtAny = event as any;
    if (typeof evtAny.webkitCompassHeading === 'number') {
      this.currentHeading = evtAny.webkitCompassHeading;
    } else if (typeof event.alpha === 'number') {
      this.currentHeading = (360 - event.alpha) % 360;
    }
  };

  /**
   * Triggered when a pedestrian step is detected.
   * If GPS is locked: increments step count without altering GPS position.
   * If GPS is LOST: applies dead reckoning Kalman displacement.
   */
  private onStepDetected() {
    this.stepCount += 1;
    const now = Date.now();
    const dt = (now - this.lastUpdateTimestamp) / 1000;
    this.lastUpdateTimestamp = now;

    if (!this.hasGPSLock()) {
      // GPS IS LOST: Use PDR and Kalman to propagate position
      const heading = this.currentHeading ?? 0;
      const headingRad = (heading * Math.PI) / 180;

      const dx = this.defaultStrideLength * Math.sin(headingRad);
      const dy = this.defaultStrideLength * Math.cos(headingRad);

      this.kalman.predict(Math.min(dt, 2.0), dx, dy);
      this.emit('pdr');
    }
  }

  /**
   * Periodic check: if GPS is lost for > 8 seconds, notify listeners that dead reckoning is active
   */
  private tick() {
    const now = Date.now();
    const dt = (now - this.lastUpdateTimestamp) / 1000;

    if (!this.hasGPSLock() && dt > 2.0) {
      this.kalman.predict(Math.min(dt, 2.0));
      this.lastUpdateTimestamp = now;
      this.emit('pdr');
    }
  }

  public getEstimate(): LocationEstimate {
    const isLock = this.hasGPSLock();

    if (isLock) {
      // 100% PURE GPS when lock exists:
      return {
        latitude: this.lastGpsLat,
        longitude: this.lastGpsLng,
        accuracyMeters: Math.round(this.lastGpsAccuracy),
        source: 'gps',
        headingDegrees: this.currentHeading,
        speedMps: null,
        stepCount: this.stepCount,
        lastGpsFixTime: this.lastGpsTimestamp || null,
        isGpsLost: false,
        timestamp: Date.now(),
      };
    }

    // PDR + Kalman Dead Reckoning when GPS is lost:
    const { lat, lng } = this.metersToLatLng(this.kalman.x, this.kalman.y);
    const rawAccuracy = Math.sqrt(this.kalman.p_pos);
    const accuracy = Math.min(Math.max(rawAccuracy, 20), 200);

    return {
      latitude: lat,
      longitude: lng,
      accuracyMeters: Math.round(accuracy),
      source: 'pdr',
      headingDegrees: this.currentHeading,
      speedMps: Math.sqrt(this.kalman.vx * this.kalman.vx + this.kalman.vy * this.kalman.vy),
      stepCount: this.stepCount,
      lastGpsFixTime: this.lastGpsTimestamp || null,
      isGpsLost: true,
      timestamp: Date.now(),
    };
  }

  public simulateStep(headingDegrees?: number) {
    if (headingDegrees !== undefined) {
      this.currentHeading = headingDegrees;
    }
    this.onStepDetected();
  }

  private emit(forcedSource?: 'gps' | 'pdr' | 'kalman_fused') {
    const estimate = this.getEstimate();
    if (forcedSource) estimate.source = forcedSource;
    this.listeners.forEach((cb) => {
      try {
        cb(estimate);
      } catch {
        // safety
      }
    });
  }

  // --- Geodetic conversion helpers (WGS-84 tangent approximation) ---
  private metersToLatLng(x: number, y: number): { lat: number; lng: number } {
    const lat = this.originLat + y / 111320;
    const lng = this.originLng + x / (111320 * Math.cos((this.originLat * Math.PI) / 180));
    return { lat, lng };
  }
}
