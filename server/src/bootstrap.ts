import type { Core } from '@strapi/strapi';

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  // "Use the desk", in Settings › Roles: the super admins have it, give it to your support roles.
  await strapi.service('admin::permission').actionProvider.registerMany([
    { section: 'plugins', displayName: 'Use the desk', uid: 'use', pluginName: 'aparte-desk' },
  ]);
};

export default bootstrap;
