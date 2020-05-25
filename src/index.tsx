import React, { FC } from 'react';
import ReactDOM from 'react-dom';
import { useRoutes } from 'hookrouter';
import * as serviceWorker from './serviceWorker';
import { Providers } from './context';
import { Updaters } from './updaters';
import { Layout } from './components/layout/Layout';
import { Home } from './components/pages/Home';
import { Swap } from './components/pages/Swap';
import { Mint } from './components/pages/Mint';
import { Save } from './components/pages/Save';
import { Exit } from './components/pages/Exit';
import { NotFound } from './components/pages/NotFound';
import { FAQ } from './components/pages/FAQ';

const routes = {
  '/': () => <Home />,
  '/mint': () => <Mint />,
  '/save': () => <Save />,
  '/swap': () => <Swap />,
  '/redeem': () => <Exit />,
  '/faq': () => <FAQ />,
};

const Root: FC<{}> = () => {
  const routeResult = useRoutes(routes);
  return (
    <Providers>
      <Updaters />
      <Layout>{routeResult || <NotFound />}</Layout>
    </Providers>
  );
};

ReactDOM.render(<Root />, document.querySelector('#root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
