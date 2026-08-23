import React, { useEffect, useRef } from 'react';
import { getAdSenseClient, installAdSense, isAdSensePathAllowed, isValidAdSenseClient } from '../services/adsense';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = {
  slot: string;
  className?: string;
  format?: string;
  responsive?: boolean;
};

export default function AdSlot({
  slot,
  className,
  format = 'auto',
  responsive = true,
}: AdSlotProps) {
  const pushedRef = useRef(false);
  const client = getAdSenseClient();
  const enabled = isValidAdSenseClient(client) && isAdSensePathAllowed() && /^\d+$/.test(slot);

  useEffect(() => {
    if (!enabled || pushedRef.current) return;
    installAdSense();
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushedRef.current = true;
    } catch (error) {
      console.warn('[AdSense] ad slot initialization skipped', error);
    }
  }, [enabled, slot]);

  if (!enabled) return null;

  return (
    <ins
      className={`adsbygoogle${className ? ` ${className}` : ''}`}
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}
