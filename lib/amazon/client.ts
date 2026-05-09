import crypto from 'crypto';
import { AMAZON_FR_MARKETPLACE } from './marketplaces';

const PAAPI_PATH = '/paapi5/getitems';
const PAAPI_TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems';
const PAAPI_SERVICE = 'ProductAdvertisingAPI';

type AmazonClientConfig = {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  partnerType: string;
};

type AmazonImageResult = {
  asin: string;
  imageUrl?: string;
};

type PaapiImageSize = {
  URL?: string;
  Height?: number;
  Width?: number;
};

type PaapiItem = {
  ASIN?: string;
  Images?: {
    Primary?: {
      Medium?: PaapiImageSize;
      Large?: PaapiImageSize;
      Small?: PaapiImageSize;
    };
  };
};

type PaapiGetItemsResponse = {
  ItemResults?: {
    Items?: PaapiItem[];
  };
  Errors?: Array<{ Code?: string; Message?: string }>;
};

function getAmazonClientConfig(): AmazonClientConfig | null {
  const accessKey = process.env.AMAZON_PAAPI_ACCESS_KEY_ID || process.env.AMAZON_ACCESS_KEY || '';
  const secretKey =
    process.env.AMAZON_PAAPI_SECRET_ACCESS_KEY || process.env.AMAZON_SECRET_KEY || '';
  const partnerTag =
    process.env.AMAZON_PAAPI_PARTNER_TAG ||
    process.env.AMAZON_PARTNER_TAG ||
    process.env.AMAZON_AFFILIATE_TAG ||
    '';
  const partnerType = process.env.AMAZON_PAAPI_PARTNER_TYPE || 'Associates';

  if (!accessKey || !secretKey || !partnerTag) return null;
  return { accessKey, secretKey, partnerTag, partnerType };
}

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function hmac(key: crypto.BinaryLike, input: string) {
  return crypto.createHmac('sha256', key).update(input, 'utf8').digest();
}

function hmacHex(key: crypto.BinaryLike, input: string) {
  return crypto.createHmac('sha256', key).update(input, 'utf8').digest('hex');
}

function getAmzDates(now = new Date()) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function signPaapiRequest(payload: string, cfg: AmazonClientConfig) {
  const marketplace = AMAZON_FR_MARKETPLACE;
  const { amzDate, dateStamp } = getAmzDates();
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
  const canonicalHeaders = [
    'content-encoding:amz-1.0',
    'content-type:application/json; charset=utf-8',
    `host:${marketplace.host}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:${PAAPI_TARGET}`,
    '',
  ].join('\n');

  const canonicalRequest = [
    'POST',
    PAAPI_PATH,
    '',
    canonicalHeaders,
    signedHeaders,
    sha256Hex(payload),
  ].join('\n');

  const credentialScope = `${dateStamp}/${marketplace.region}/${PAAPI_SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const dateKey = hmac(`AWS4${cfg.secretKey}`, dateStamp);
  const regionKey = hmac(dateKey, marketplace.region);
  const serviceKey = hmac(regionKey, PAAPI_SERVICE);
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = hmacHex(signingKey, stringToSign);

  return {
    Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'Content-Encoding': 'amz-1.0',
    'Content-Type': 'application/json; charset=utf-8',
    Host: marketplace.host,
    'X-Amz-Date': amzDate,
    'X-Amz-Target': PAAPI_TARGET,
  };
}

function uniqueAsins(asins: string[]) {
  return Array.from(new Set(asins.map((asin) => asin.trim()).filter(Boolean)));
}

export async function fetchAmazonMediumImagesByAsin(asins: string[]): Promise<Map<string, string>> {
  const cfg = getAmazonClientConfig();
  if (!cfg) return new Map();

  const marketplace = AMAZON_FR_MARKETPLACE;
  const results = new Map<string, string>();
  const cleanAsins = uniqueAsins(asins);

  for (let i = 0; i < cleanAsins.length; i += 10) {
    const batch = cleanAsins.slice(i, i + 10);
    const body = JSON.stringify({
      ItemIds: batch,
      ItemIdType: 'ASIN',
      LanguagesOfPreference: [marketplace.language],
      Marketplace: marketplace.marketplace,
      PartnerTag: cfg.partnerTag,
      PartnerType: cfg.partnerType,
      Resources: ['Images.Primary.Medium'],
    });

    const response = await fetch(`https://${marketplace.host}${PAAPI_PATH}`, {
      method: 'POST',
      headers: signPaapiRequest(body, cfg),
      body,
    });

    if (!response.ok) {
      throw new Error(`Amazon PA-API error ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as PaapiGetItemsResponse;
    for (const item of data.ItemResults?.Items || []) {
      const asin = item.ASIN;
      const imageUrl = item.Images?.Primary?.Medium?.URL;
      if (asin && imageUrl) results.set(asin, imageUrl);
    }
  }

  return results;
}

export type { AmazonImageResult };
