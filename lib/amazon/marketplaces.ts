export type AmazonMarketplaceCode = 'FR';

export type AmazonMarketplaceConfig = {
  code: AmazonMarketplaceCode;
  host: string;
  marketplace: string;
  region: string;
  language: string;
};

export const AMAZON_FR_MARKETPLACE: AmazonMarketplaceConfig = {
  code: 'FR',
  host: 'webservices.amazon.fr',
  marketplace: 'www.amazon.fr',
  region: 'eu-west-1',
  language: 'fr_FR',
};
