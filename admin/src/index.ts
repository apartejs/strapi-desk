import { getTranslation } from './utils/getTranslation';
import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';

import type { StrapiApp } from '@strapi/strapi/admin';

/** Whoever may use the desk sees it in the menu: "Use the desk", in Settings › Roles. */
export const USE = [{ action: 'plugin::aparte-desk.use', subject: null }];

const plugin: StrapiApp['appPlugins'][string] = {
  register(app) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: { id: getTranslation('plugin.name'), defaultMessage: 'Conversations' },
      Component: () => import('./pages/App'),
      permissions: USE,
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  async registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = (await import(`./translations/${locale}.json`)) as { default: Record<string, string> };
          return { data: Object.fromEntries(Object.entries(data).map(([key, value]) => [getTranslation(key), value])), locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};

export default plugin;
