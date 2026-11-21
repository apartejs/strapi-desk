import { Desk } from './Desk';

/**
 * The desk's page. The admin shows it only to a role allowed to see the conversations (the menu
 * link carries that permission); the server checks every route again, so the page has no router
 * and no guard of its own: neither is the same in Strapi 4 and in Strapi 5.
 */
const App = () => <Desk />;

export default App;
