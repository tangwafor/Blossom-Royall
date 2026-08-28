"use client";

import { useEffect, useState } from "react";

export type RetailPolicy = {
  returnWindowDays: number;
  windowStarts: "purchase" | "delivery" | "last_delivery";
  receiptRequired: boolean;
  allowExchange: boolean;
  allowStoreCredit: boolean;
  refundMethod: "original" | "store_credit" | "choice";
  returnShipping: "free" | "flat" | "customer";
  returnShippingFee: number;
  restockingFeePercent: number;
  finalSaleTags: string;
  layawayEnabled: boolean;
  layawayDepositPercent: number;
  layawayTermDays: number;
  layawayPaymentFrequency: "weekly" | "biweekly" | "monthly";
  layawayGraceDays: number;
  layawayCancellationFee: number;
  holdInventory: boolean;
};

export type CommerceSettings = {
  payoutCadence: "weekly" | "biweekly" | "monthly";
  payoutDay: string;
  returnReservePercent: number;
  minimumPayout: number;
  autoRebalance: boolean;
  targetCoverDays: number;
  requireScanMatch: boolean;
};

export type DeliverySettings = {
  deliveryTaxable: boolean;
  pickupEnabled: boolean;
  localDeliveryEnabled: boolean;
  shippingEnabled: boolean;
  localRadiusMiles: number;
  freeLocalMinimum: number;
  localFee: number;
  shippingFee: number;
  handlingDays: number;
  consolidationHours: number;
  routingPriority: "fewest_packages" | "fastest" | "lowest_cost";
  signatureThreshold: number;
  vendorFulfillmentEnabled: boolean;
  allowOnlineBackorders: boolean;
};

export type StoreSettings = {
  publicName: string;
  legalName: string;
  ownerDisplayName: string;
  address: string;
  receiptPhone: string;
  receiptEmail: string;
  currency: string;
  locale: string;
  timezone: string;
  taxInclusive: boolean;
  taxRatePercent: number;
  orderPrefix: string;
};

export const retailPolicyDefaults: RetailPolicy = {
  returnWindowDays: 30,
  windowStarts: "delivery",
  receiptRequired: true,
  allowExchange: true,
  allowStoreCredit: true,
  refundMethod: "choice",
  returnShipping: "free",
  returnShippingFee: 0,
  restockingFeePercent: 0,
  finalSaleTags: "Final sale, Personalized, Worn intimate apparel",
  layawayEnabled: true,
  layawayDepositPercent: 20,
  layawayTermDays: 60,
  layawayPaymentFrequency: "biweekly",
  layawayGraceDays: 5,
  layawayCancellationFee: 10,
  holdInventory: true,
};

export const commerceDefaults: CommerceSettings = {
  payoutCadence: "biweekly",
  payoutDay: "Friday",
  returnReservePercent: 8,
  minimumPayout: 50,
  autoRebalance: true,
  targetCoverDays: 21,
  requireScanMatch: true,
};

export const deliveryDefaults: DeliverySettings = {
  deliveryTaxable: false,
  pickupEnabled: true,
  localDeliveryEnabled: true,
  shippingEnabled: true,
  localRadiusMiles: 15,
  freeLocalMinimum: 150,
  localFee: 9,
  shippingFee: 12,
  handlingDays: 1,
  consolidationHours: 4,
  routingPriority: "fewest_packages",
  signatureThreshold: 500,
  vendorFulfillmentEnabled: true,
  allowOnlineBackorders: false,
};

export const storeDefaults: StoreSettings = {
  publicName: "Blossom Royall",
  legalName: "",
  ownerDisplayName: "Delly",
  address: "",
  receiptPhone: "",
  receiptEmail: "",
  currency: "USD",
  locale: "en-US",
  timezone: "America/New_York",
  taxInclusive: false,
  taxRatePercent: 0,
  orderPrefix: "BR",
};

const keys = {
  policy: "br-retail-policy:blossom-royall",
  commerce: "br-shared-commerce:blossom-royall",
  delivery: "br-delivery:blossom-royall",
  store: "br-store-settings:blossom-royall",
} as const;

function useTenantSection<T extends object>(key: string, defaults: T) {
  const [value, setValue] = useState<T>(defaults);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const load = () => {
      const stored = localStorage.getItem(key);
      setValue(stored ? { ...defaults, ...JSON.parse(stored) } : defaults);
    };
    load();
    window.addEventListener("br-tenant-config", load);
    return () => window.removeEventListener("br-tenant-config", load);
  }, [key, defaults]);
  const update = <K extends keyof T>(field: K, next: T[K]) => {
    setSaved(false);
    setValue((current) => ({ ...current, [field]: next }));
  };
  const save = () => {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("br-tenant-config"));
    setSaved(true);
  };
  return { value, setValue, update, save, saved };
}

export const useRetailPolicy = () =>
  useTenantSection(keys.policy, retailPolicyDefaults);
export const useCommerceSettings = () =>
  useTenantSection(keys.commerce, commerceDefaults);
export const useDeliverySettings = () =>
  useTenantSection(keys.delivery, deliveryDefaults);
export const useStoreSettings = () =>
  useTenantSection(keys.store, storeDefaults);
