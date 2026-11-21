import { Page } from '@strapi/strapi/admin';
import { Routes, Route } from 'react-router-dom';

import { Desk } from './Desk';

const App = () => (
  <Page.Protect permissions={[{ action: 'plugin::aparte-desk.use', subject: null }]}>
    <Routes>
      <Route index element={<Desk />} />
      <Route path=":id" element={<Desk />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  </Page.Protect>
);

export default App;
