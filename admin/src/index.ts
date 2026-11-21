import { getTranslation } from './utils/getTranslation';
import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';

/**
 * The admin's side of the plugin, the same for Strapi 4 and Strapi 5: both call `register` and
 * `registerTrads`, and both take `addMenuLink` with these fields (Strapi 4 reads `Component` as a
 * loader too). Typed loosely here, since each version types the app differently.
 */
interface AdminApp {
  addMenuLink: (link: Record<string, unknown>) => void;
  registerPlugin: (plugin: Record<string, unknown>) => void;
  /** Strapi 5's app has its router here; Strapi 4's has none. */
  router?: unknown;
}

/** Whoever may see the conversations finds the desk in the menu: Settings › Roles › aparté Desk. */
const READ = [{ action: 'plugin::aparte-desk.read', subject: null }];

const plugin = {
  register(app: AdminApp) {
    app.addMenuLink({
      // Strapi 5 wants the path relative to the admin (it warns on a leading "/"), Strapi 4
      // matches it as a route of its own, from the root.
      to: 'router' in app ? `plugins/${PLUGIN_ID}` : `/plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: { id: getTranslation('plugin.name'), defaultMessage: 'aparté Desk' },
      Component: () => import('./pages/App'),
      permissions: READ,
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
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
