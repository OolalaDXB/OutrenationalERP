/**
 * Carrier tracking URL configuration
 * Returns the tracking page URL for a given carrier and tracking number
 */

export interface CarrierConfig {
  label: string;
  urlTemplate: string;
}

export const carrierConfigs: Record<string, CarrierConfig> = {
  dhl: {
    label: 'DHL',
    urlTemplate: 'https://www.dhl.com/fr-fr/home/tracking.html?tracking-id={tracking_number}',
  },
  fedex: {
    label: 'FedEx',
    urlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={tracking_number}',
  },
  ups: {
    label: 'UPS',
    urlTemplate: 'https://www.ups.com/track?tracknum={tracking_number}',
  },
  colissimo: {
    label: 'Colissimo',
    urlTemplate: 'https://www.laposte.fr/outils/suivre-vos-envois?code={tracking_number}',
  },
  la_poste: {
    label: 'La Poste',
    urlTemplate: 'https://www.laposte.fr/outils/suivre-vos-envois?code={tracking_number}',
  },
  chronopost: {
    label: 'Chronopost',
    urlTemplate: 'https://www.chronopost.fr/tracking-no-cms/suivi-page?liession={tracking_number}',
  },
  tnt: {
    label: 'TNT',
    urlTemplate: 'https://www.tnt.com/express/fr_fr/site/outils-expedition/suivi.html?searchType=con&cons={tracking_number}',
  },
  gls: {
    label: 'GLS',
    urlTemplate: 'https://gls-group.com/FR/fr/suivi-colis?match={tracking_number}',
  },
  mondial_relay: {
    label: 'Mondial Relay',
    urlTemplate: 'https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition={tracking_number}',
  },
  dpd: {
    label: 'DPD',
    urlTemplate: 'https://www.dpd.fr/trace/{tracking_number}',
  },
  other: {
    label: 'Autre',
    urlTemplate: 'https://www.google.com/search?q=track+{tracking_number}',
  },
};

/**
 * Get the tracking URL for a given carrier and tracking number
 */
export function getCarrierTrackingUrl(carrier: string | null | undefined, trackingNumber: string): string {
  const config = carrierConfigs[carrier || 'other'] || carrierConfigs.other;
  return config.urlTemplate.replace('{tracking_number}', encodeURIComponent(trackingNumber));
}

/**
 * Get the carrier label for display
 */
export function getCarrierLabel(carrier: string | null | undefined): string {
  if (!carrier) return 'Inconnu';
  return carrierConfigs[carrier]?.label || carrier;
}
