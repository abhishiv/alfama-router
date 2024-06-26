# alfama Router

Router for [alfama](https://github.com/abhishiv/alfama) inspired by react-router

[![Version](https://img.shields.io/npm/v/alfama-router.svg?color=success&style=flat-square)](https://www.npmjs.com/package/alfama-router)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/abhishiv/alfama-router/actions/workflows/ci.yml/badge.svg)](https://github.com/abhishiv/alfama-router/actions/workflows/ci.yml)
![Badge size](https://img.badgesize.io/https://cdn.jsdelivr.net/npm/alfama-router/+esm?compression=gzip&label=gzip&style=flat-square)

**npm**: `npm i alfama-router`  
**cdn**: https://cdn.jsdelivr.net/npm/alfama-router/+esm

#### Example

```tsx
/** @jsx h **/

import { component, h, render } from "alfama";
import { Link, Route, Switch, BrowserRouter } from "alfama-router";

export const Layout = component<{}>("Layout", (props, {}) => {
  return (
    <BrowserRouter>
      <div>
        <ul>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href="/about">About</Link>
          </li>
        </ul>
        <Switch>
          <Route path="" component={Home} />
          <Route path="about" component={About} />
        </Switch>
      </div>
    </BrowserRouter>
  );
});
export const Home = component<{}>("Home", (props, {}) => {
  return <div>Home</div>;
});

export const About = component<{}>("About", (props, {}) => {
  return <div>About</div>;
});

render(<Layout />, document.body);
```

#### Ecosystem

- [alfama](https://github.com/abhishiv/alfama)
