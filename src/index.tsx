/** @jsx h **/

import {
  component,
  h,
  defineContext as defineContext,
  VElement,
  Component,
  When,
  Signal,
  Fragment,
} from "alfama";
import { Key, pathToRegexp } from "path-to-regexp";
//import { parse } from "regexparam";
export * from "path-to-regexp";
// Example usage
export type ParentRouteObject =
  | {
      pathname: string;
      realpath: string;
      parent: ParentRouteObject;
      params: Record<string, string>;
    }
  | undefined;

export const RouterContext =
  defineContext<Signal<RouterObject>>("RouterContext");
export const ParentRouteContext =
  defineContext<Signal<ParentRouteObject>>("ParentRouteContext");

export type History = typeof window.history;
export type Location = typeof window.location;

export class RouterObject extends EventTarget {
  history: History;
  location: Location;
  constructor(history: History, location: Location) {
    super();
    this.history = history;
    this.location = location;
    if (typeof window !== "undefined") {
      window.addEventListener("popstate", (e) => {
        this.dispatchEvent(new Event("popstate"));
      });
    }
  }
  pushState(state: Record<string, any>, empty: "", path: string) {
    this.history.pushState({ ...state, t: Date.now() }, empty, path);
    this.dispatchEvent(new Event("popstate"));
  }
  navigate(path: string) {
    this.pushState({}, "", path);
  }
  getQuery() {
    const query = window.location.search.substring(1);
    const vars = query.split("&");
    const obj: Record<string, string> = {};
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split("=");
      const key = pair[0];
      let value = decodeURIComponent(pair[1]);
      if (["undefined"].indexOf(value) === -1) obj[key] = value;
    }
    return obj;
  }
}

export function createRouter(
  history: History,
  location: Location
): RouterObject {
  return new RouterObject(history, location);
}

export const Route = component<{
  path: string;
  component: Component<any> | h.JSX.Element;
}>("alfama.Router.Route", (props, { signal, wire, getContext, utils }) => {
  const $ownerRoute = getContext(ParentRouteContext);
  //console.log($ownerRoute.get());
  const views = new Proxy(
    {},
    {
      get: function (obj, prop) {
        const ownerRoute = $ownerRoute.get();
        //console.log("alfama.Router.Route", props, ownerRoute);
        if (!ownerRoute && !props.path) {
          //console.log("owner", props);
          return () => {
            return h(props.component as any);
          };
        } else if (ownerRoute && ownerRoute.pathname === props.path) {
          return () => {
            return h(props.component as any);
          };
        } else {
          return () => null;
        }
      },
    }
  );
  return (
    <When
      condition={($) => $ownerRoute.get($)?.pathname as string}
      views={views}
    ></When>
  );
});

export const Switch = component(
  "alfama.Router.Switch",
  (
    props: { children: VElement | VElement[]; onChange?: Function },
    { signal, wire, getContext, setContext, utils, onUnmount }
  ) => {
    const $activeRoute = signal<null | any>("active", null);

    const $ownerRoute = getContext(ParentRouteContext);
    setContext(ParentRouteContext, $activeRoute);

    const $router = getContext(RouterContext);
    const router = $router.get();

    const routes = (
      props.children
        ? Array.isArray(props.children)
          ? props.children
          : [props.children]
        : []
    )
      .map((el) => ({
        path: (el as any)?.p?.path,
        component: (el as any)?.p?.component,
      }))
      .filter((el) => el.component);

    //console.log("routes", routes);

    const updateActiveRoute = (attrs?: {
      route?: { path: string };
      params?: Record<string, string>;
      pathname?: string;
    }) => {
      const { route, params, pathname } = attrs || {};
      //console.log("updateActiveRoute", route, pathname);
      if (route && pathname) {
        const currentRoute: ParentRouteObject = {
          pathname: route.path,
          realpath: pathname,
          params: params || {},
          parent: $ownerRoute ? $ownerRoute.get() : undefined,
        };
        $activeRoute.set(currentRoute);
        //console.log("$activeRoute", $activeRoute.get());
        if (props.onChange) props.onChange(currentRoute);
      } else {
        $activeRoute.set(null);
      }
    };
    const onPopstate = () => {
      updateActiveRoute(
        matchRoutes($ownerRoute ? $ownerRoute.get() : undefined, router, routes)
      );
    };
    router.addEventListener("popstate", onPopstate);
    updateActiveRoute(
      matchRoutes($ownerRoute ? $ownerRoute.get() : undefined, router, routes)
    );
    onUnmount(() => {
      router.removeEventListener("popstate", onPopstate);
    });
    return props.children as any;
  }
);

// Function to find the matching route for a given pathname
function matchRoutes(
  parentRoute: ParentRouteObject | undefined,
  router: RouterObject,
  routes: { component: Component; path: string }[]
) {
  let pathname = router.location.pathname.slice(1);

  //let parentPath : string|undefined = undefined
  //console.log("parentRoute", parentRoute);
  const parentPath = parentRoute ? parentRoute.pathname : undefined;
  //console.log(pathname, parentPath);
  if (parentPath)
    pathname = pathname.replace(new RegExp("^" + parentPath + ""), "");
  if (pathname[0] === "/") pathname = pathname.slice(1);
  //console.log("matchRoutes", parentPath, pathname, routes);
  for (const route of routes) {
    const keys: Key[] = [];
    const regexp = pathToRegexp("/" + route.path, keys);
    //console.log("p", "/" + pathname, "/" + route.path);
    const match = regexp.exec("/" + pathname);
    if (match) {
      // Extract the parameters from the matched route
      const params: any = {};

      keys.forEach((k, i) => {
        params[k.name] = match[i + 1];
      });

      return {
        route,
        params,
        pathname,
      };
    }
  }

  // Return null if no matching route is found
  return undefined;
}

export const BrowserRouter = component<{
  router?: RouterObject;
  children: VElement | VElement[];
}>("alfama-router.Browser", (props, { setContext, signal }) => {
  setContext(
    RouterContext,
    signal(
      "router",
      props.router || createRouter(window.history, window.location)
    )
  );
  return <Fragment>{props.children}</Fragment>;
});

export const StaticRouter = component("alfama-router.Static", (props) => {
  return props.children;
});

export const Link = component<
  h.JSX.HTMLAttributes<HTMLAnchorElement> & { onClick?: Function }
>("Router.Link", (props, { signal, wire, getContext }) => {
  const $router = getContext(RouterContext);
  return (
    <a
      {...props}
      onClick={(e) => {
        if (props.onClick) {
          return props.onClick(e);
        }
        e.preventDefault();
        if (!$router) {
          throw new Error("Please define root router");
        }
        const r = $router.get();
        const href =
          typeof props.href === "object" ? props.href.run() : props.href;
        if (href) r.pushState({}, "", href);
        if (props.onClick) {
          // why
          (props as any).onClick(e);
        }
      }}
      href={props.href}
    >
      {props.children}
    </a>
  );
});
