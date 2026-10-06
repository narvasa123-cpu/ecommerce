import { defineCloudflareConfig } from '@opennextjs/cloudflare';

const config = {
  ...defineCloudflareConfig(),
  buildCommand: 'npx next build --webpack',
};
export default config;
