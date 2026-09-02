"use client";

import { useEffect, useRef } from "react";

import { authRequest, getStoredSession } from "@/lib/dispatchos-auth";
import { recordCompletedJobEarning } from "@/lib/platform/driver-compensation";

type PayTrackingJob = {
  id: string;
  status: string;
  companySlug?: string | null;
  driverId?: string | null;
  service?: string | null;
};

type MileageState = {
  companySlug: string;
  jobId: string;
  driverId: string;
  miles: number;
  lastLat: number | null;
  lastLng: number | null;
  lastTimestamp: number | null;
  startedAt: string;
  updatedAt: string;
};

const LOCAL_JOBS_KEY = "dispatch_jobs";
const MILEAGE_KEY_PREFIX = "dispatch.driver-pay.mileage.";
const MIN_SEGMENT_MILES = 0.003;
const MAX_GPS_ACCURACY_METERS = 150;
const TRACKABLE_STATUSES = new Set([
  "Accepted",
  "En Route",
  "Arrived",
  "In Progress",
  "Go to Pickup",
  "Pickup Required",
  "Pickup Verified",
  "In Transit",
  "En Route to Customer",
]);

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const haversineMiles = (
  from: [number, number],
  to: [number, number]
) => {
  const [lat1, lon1] = from;
  const [lat2, lon2] = to;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 3958.7613 * c;
};

const stateKey = (companySlug: string) => `${MILEAGE_KEY_PREFIX}${companySlug}`;

const readState = (companySlug: string): MileageState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(stateKey(companySlug));
    return raw ? (JSON.parse(raw) as MileageState) : null;
  } catch {
    return null;
  }
};

const writeState = (state: MileageState | null) => {
  if (typeof window === "undefined") return;
  if (!state) return;
  window.localStorage.setItem(stateKey(state.companySlug), JSON.stringify(state));
};

const clearState = (companySlug: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(stateKey(companySlug));
};

const readLocalJobs = (): PayTrackingJob[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_JOBS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PayTrackingJob[]) : [];
  } catch {
    return [];
  }
};

const getJobs = async (companySlug: string): Promise<PayTrackingJob[]> => {
  try {
    const data = await authRequest(`/api/jobs?company=${encodeURIComponent(companySlug)}`, {
      method: "GET",
      cache: "no-store",
    });
    if (Array.isArray(data?.jobs)) return data.jobs as PayTrackingJob[];
  } catch {
    // Static/demo mode falls back to the local job store.
  }

  const local = readLocalJobs();
  const scoped = local.filter((job) => (job.companySlug ?? companySlug) === companySlug);
  return scoped.length ? scoped : local;
};

const createInitialState = (
  companySlug: string,
  job: PayTrackingJob
): MileageState => ({
  companySlug,
  jobId: job.id,
  driverId: job.driverId || "",
  miles: 0,
  lastLat: null,
  lastLng: null,
  lastTimestamp: null,
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function DriverPayRecorder() {
  const activeStateRef = useRef<MileageState | null>(null);
  const finalizingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const session = getStoredSession();
    if (!session) return;

    const companySlug = session.company.slug;
    activeStateRef.current = readState(companySlug);

    const finalize = async (job: PayTrackingJob, state: MileageState) => {
      if (finalizingRef.current.has(job.id)) return;
      finalizingRef.current.add(job.id);

      const roundedMiles = Math.round(state.miles * 100) / 100;
      const milesForLedger = roundedMiles >= 0.05 ? roundedMiles : null;
      const driverId = job.driverId || state.driverId;

      try {
        if (!driverId) throw new Error("Driver ID unavailable");

        await authRequest("/api/driver-pay/earnings", {
          method: "POST",
          body: JSON.stringify({
            jobId: job.id,
            driverId,
            miles: milesForLedger,
          }),
        });
      } catch {
        if (driverId) {
          recordCompletedJobEarning({
            companySlug,
            jobId: job.id,
            driverId,
            service: job.service || undefined,
            miles: milesForLedger,
          });
        }
      } finally {
        clearState(companySlug);
        activeStateRef.current = null;
        finalizingRef.current.delete(job.id);
      }
    };

    const syncJob = async () => {
      const jobs = await getJobs(companySlug);
      let state = activeStateRef.current ?? readState(companySlug);

      if (state) {
        const trackedJob = jobs.find((job) => job.id === state?.jobId);
        if (trackedJob?.driverId && !state.driverId) {
          state = { ...state, driverId: trackedJob.driverId, updatedAt: new Date().toISOString() };
          activeStateRef.current = state;
          writeState(state);
        }

        if (trackedJob?.status === "Completed") {
          await finalize(trackedJob, state);
          return;
        }

        if (trackedJob?.status === "Cancelled") {
          clearState(companySlug);
          activeStateRef.current = null;
          return;
        }
      }

      if (!state) {
        const activeJob = jobs.find((job) => TRACKABLE_STATUSES.has(job.status));
        if (activeJob) {
          state = createInitialState(companySlug, activeJob);
          activeStateRef.current = state;
          writeState(state);
        }
      }
    };

    void syncJob();
    const poll = window.setInterval(() => void syncJob(), 2500);

    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const state = activeStateRef.current;
          if (!state) return;
          if (position.coords.accuracy > MAX_GPS_ACCURACY_METERS) return;

          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const timestamp = position.timestamp || Date.now();

          if (state.lastLat == null || state.lastLng == null || state.lastTimestamp == null) {
            const seeded = {
              ...state,
              lastLat: lat,
              lastLng: lng,
              lastTimestamp: timestamp,
              updatedAt: new Date().toISOString(),
            };
            activeStateRef.current = seeded;
            writeState(seeded);
            return;
          }

          const segmentMiles = haversineMiles(
            [state.lastLat, state.lastLng],
            [lat, lng]
          );
          const elapsedHours = Math.max(1, timestamp - state.lastTimestamp) / 3_600_000;
          const maxPlausibleMiles = Math.max(0.2, elapsedHours * 110);

          const shouldCount =
            segmentMiles >= MIN_SEGMENT_MILES && segmentMiles <= maxPlausibleMiles;

          const next: MileageState = {
            ...state,
            miles: shouldCount ? state.miles + segmentMiles : state.miles,
            lastLat: lat,
            lastLng: lng,
            lastTimestamp: timestamp,
            updatedAt: new Date().toISOString(),
          };

          activeStateRef.current = next;
          writeState(next);
        },
        () => {
          // Mileage will be marked needs-review if the device never provides usable GPS data.
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 5000,
        }
      );
    }

    return () => {
      window.clearInterval(poll);
      if (watchId != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return null;
}
