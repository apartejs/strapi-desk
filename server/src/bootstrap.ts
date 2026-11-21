import type { Core } from '@strapi/strapi';
import { ACTIONS } from './permissions';

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  await strapi.service('admin::permission').actionProvider.registerMany(
    Object.values(ACTIONS).map(({ uid, displayName }) => ({ section: 'plugins', displayName, uid, pluginName: 'aparte-desk' }))
  );
};

export default bootstrap;
