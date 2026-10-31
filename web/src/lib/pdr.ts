/**
 * Pedestrian Dead Reckoning (PDR) & 2D Extended Kalman Filter
 * 
 * Fuses GPS observations with accelerometer step detection and compass orientation.
 * When GPS lock is lost (underground, indoor shelter, or signal loss),
 * dead reckoning propagates the position estimate using detected strides,
 * while expanding uncertainty bounds per Rule 8.
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

  // Covariance matrix (diagonal approximations for fast real-time mobile execution)
  public p_pos: number = 100; // pos variance (m^2)
  public p_vel: number = 4;   // vel variance ((m/s)^2)

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
      this.p_pos += 1.2;
    } else {
      // Kinematic drift prediction
      this.x += this.vx * dtSeconds;
      this.y += this.vy * dtSeconds;
      this.p_pos += this.q_pos * dtSeconds;
      this.p_vel += this.q_vel * dtSeconds;
    }
  }

  public updateGPS(measuredX: number, measuredY: number, accuracyMeters: number) {
    const r = Math.max(accuracyMeters * accuracyMeters, 4); // Measurement variance R

    // Kalman gain for position
    const k_pos = this.p_pos / (this.p_pos + r);

    // Innovation (measurement residual)
    const resX = measuredX - this.x;
    const resY = measuredY - this.y;

    // Update state
    this.x += k_pos * resX;
    this.y += k_pos * resY;

    // Update covariance
    this.p_pos = (1 - k_pos) * this.p_pos;
  }
}

export class PDRKalmanTracker {
  private kalman: Kalman2D = new Kalman2D();
  private originLat: number;
  private originLng: number;
  private hasOrigin: boolean = false;

  private lastGpsTimestamp: number = 0;
  private lastUpdateTimestamp: number = Date.now();
  private lastGpsAccuracy: number = 25;

  // Orientation & Compass
  private currentHeading: number | null = null; // degrees from true North

  // Step detection
  private stepCount: number = 0;
  private defaultStrideLength: number = 0.74; // meters per stride
  private lastAccelMagnitude: number = 9.8;
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
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastUpdateTimestamp = Date.now();

    if (typeof window !== 'undefined') {
      // Device Motion (Accelerometer)
      window.addEventListener('devicemotion', this.handleDeviceMotion, true);

      // Device Orientation (Compass)
      window.addEventListener('deviceorientation', this.handleDeviceOrientation, true);
    }

    // Regular interval to evaluate GPS expiration and emit fused state
    this.periodicInterval = setInterval(() => {
      this.tick();
    }, 500);
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
   * Feed a new GPS observation into the Kalman filter
   */
  public updateGPS(lat: number, lng: number, accuracyMeters: number = 15) {
    const now = Date.now();
    const dt = (now - this.lastUpdateTimestamp) / 1000;
    this.lastUpdateTimestamp = now;
    this.lastGpsTimestamp = now;
    this.lastGpsAccuracy = accuracyMeters;

    if (!this.hasOrigin) {
      this.originLat = lat;
      this.originLng = lng;
      this.hasOrigin = true;
      this.kalman.x = 0;
      this.kalman.y = 0;
      this.kalman.p_pos = accuracyMeters * accuracyMeters;
      this.emit();
      return;
    }

    // Convert GPS (lat, lng) to local metric offset (x, y) relative to origin
    const { x: measuredX, y: measuredY } = this.latLngToMeters(lat, lng);

    this.kalman.predict(Math.min(dt, 2.0));
    this.kalman.updateGPS(measuredX, measuredY, accuracyMeters);

    this.emit('kalman_fused');
  }

  /**
   * Device motion handler for peak detection step counting
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
    const thresholdHigh = 10.8; // ~1.1g threshold above Earth gravity
    const thresholdLow = 8.8;

    // Detect step peak followed by return
    if (!this.isStepPeakDetected && smoothed > thresholdHigh) {
      if (now - this.lastStepTimestamp > 280) {
        // Enforce max cadence (<= 3.5 steps/sec)
        this.isStepPeakDetected = true;
      }
    } else if (this.isStepPeakDetected && smoothed < thresholdLow) {
      this.isStepPeakDetected = false;
      this.lastStepTimestamp = now;
      this.onStepDetected();
    }

    this.lastAccelMagnitude = smoothed;
  };

  /**
   * Device orientation handler for compass bearing
   */
  private handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    // iOS provides direct webkitCompassHeading
    const evtAny = event as any;
    if (typeof evtAny.webkitCompassHeading === 'number') {
      this.currentHeading = evtAny.webkitCompassHeading;
    } else if (typeof event.alpha === 'number') {
      // Android: alpha 0 is typically North with compass integration
      this.currentHeading = (360 - event.alpha) % 360;
    }
  };

  /**
   * Triggered when a pedestrian step is identified
   */
  private onStepDetected() {
    this.stepCount += 1;
    const now = Date.now();
    const dt = (now - this.lastUpdateTimestamp) / 1000;
    this.lastUpdateTimestamp = now;

    // Default to forward heading if compass is unavailable
    const heading = this.currentHeading ?? 0;
    const headingRad = (heading * Math.PI) / 180;

    // Displacement in meters: North = +Y, East = +X
    const dx = this.defaultStrideLength * Math.sin(headingRad);
    const dy = this.defaultStrideLength * Math.cos(headingRad);

    // Predict forward using PDR stride
    this.kalman.predict(Math.min(dt, 2.0), dx, dy);

    this.emit(this.hasGPSLock() ? 'kalman_fused' : 'pdr');
  }

  /**
   * Periodic check: if GPS is lost for > 8 seconds, mark as GPS Lost
   */
  private tick() {
    const now = Date.now();
    const dt = (now - this.lastUpdateTimestamp) / 1000;

    if (!this.hasGPSLock() && dt > 1.5) {
      // Slowly increase uncertainty if standing still or lost GPS
      this.kalman.predict(Math.min(dt, 2.0));
      this.lastUpdateTimestamp = now;
      this.emit('pdr');
    }
  }

  public hasGPSLock(): boolean {
    if (!this.lastGpsTimestamp) return false;
    return Date.now() - this.lastGpsTimestamp < 8000; // 8 seconds timeout
  }

  public getEstimate(): LocationEstimate {
    const { lat, lng } = this.metersToLatLng(this.kalman.x, this.kalman.y);
    const isLock = this.hasGPSLock();
    const rawAccuracy = Math.sqrt(this.kalman.p_pos);
    const accuracy = Math.min(Math.max(rawAccuracy, isLock ? 4 : 15), 180);

    return {
      latitude: lat,
      longitude: lng,
      accuracyMeters: Math.round(accuracy),
      source: isLock ? 'gps' : 'pdr',
      headingDegrees: this.currentHeading,
      speedMps: Math.sqrt(this.kalman.vx * this.kalman.vx + this.kalman.vy * this.kalman.vy),
      stepCount: this.stepCount,
      lastGpsFixTime: this.lastGpsTimestamp || null,
      isGpsLost: !isLock,
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

  private latLngToMeters(lat: number, lng: number): { x: number; y: number } {
    const dLat = lat - this.originLat;
    const dLng = lng - this.originLng;
    const y = dLat * 111320;
    const x = dLng * (111320 * Math.cos((this.originLat * Math.PI) / 180));
    return { x, y };
  }

  private metersToLatLng(x: number, y: number): { lat: number; lng: number } {
    const lat = this.originLat + y / 111320;
    const lng = this.originLng + x / (111320 * Math.cos((this.originLat * Math.PI) / 180));
    return { lat, lng };
  }
}
