"use client";

import { useEffect, useState, useCallback } from "react";
import { CHARGENEXT_DEFAULTS } from "@/lib/constants";

export type UserLocation = {
  lat: number;
  lng: number;
  accuracy?: number;
};

export type GeolocationState = {
  location: UserLocation | null;
  isLoading: boolean;
  error: string | null;
};

export function useGeolocation(autoRequest = true): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    isLoading: autoRequest,
    error: null,
  });

  const requestLocation = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    if (!navigator.geolocation) {
      setState({
        location: null,
        isLoading: false,
        error: "Geolocation is not supported by this browser",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setState({
          location: {
            lat: latitude,
            lng: longitude,
            accuracy,
          },
          isLoading: false,
          error: null,
        });
      },
      (error) => {
        let errorMessage = "Failed to get location";
        if (error.code === 1) {
          errorMessage = "Location permission denied";
        } else if (error.code === 2) {
          errorMessage = "Location unavailable";
        } else if (error.code === 3) {
          errorMessage = "Location request timeout";
        }

        setState({
          location: null,
          isLoading: false,
          error: errorMessage,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    if (autoRequest) {
      const timeoutId = window.setTimeout(() => {
        requestLocation();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [autoRequest, requestLocation]);

  return state;
}

/**
 * Get the center coordinates for the map
 * Returns user's location if available, otherwise defaults to DC
 */
export function getMapCenter(userLocation: UserLocation | null) {
  if (userLocation) {
    return {
      lat: userLocation.lat,
      lng: userLocation.lng,
    };
  }
  return CHARGENEXT_DEFAULTS.mapCenter;
}
