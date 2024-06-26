/** @jsx h **/

import {
  component,
  h,
  defineContext as defineContext,
  VElement,
  Component,
  When,
  Signal,
} from "alfama";
import { Key, pathToRegexp } from "path-to-regexp";
//import { parse } from "regexparam";
export * from "path-to-regexp";
// Example usage
export type ParentRouteObject =
  | {
      pathname: string;
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

class RouterObject extends EventTarget {
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
    this.history.pushState(state, empty, path);
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
  return (
    <When
      condition={($) => $ownerRoute($)?.pathname === props.path}
      views={{
        true: () => h(props.component as any),
        false: () => null,
      }}
    ></When>
  );
});

export const Switch = component(
  "alfama.Router.Switch",
  (
    props: { children: VElement[]; onChange?: Function },
    { signal, wire, getContext, setContext, utils, onUnmount }
  ) => {
    const $activeRoute = signal<null | any>("active", null);

    const $ownerRoute = getContext(ParentRouteContext);
    setContext(ParentRouteContext, $activeRoute);

    const $router = getContext(RouterContext);
    const router = $router();

    const routes = props.children
      .map((el) => ({
        path: (el as any)?.p?.path,
        component: (el as any)?.p?.component,
      }))
      .filter((el) => el.component);

    //    console.log("routes", routes);

    const updateActiveRoute = ({
      route,
      params,
    }: {
      route?: { path: string };
      params?: Record<string, string>;
    } = {}) => {
      //console.log("updateActiveRoute", route);
      if (route) {
        const currentRoute: ParentRouteObject = {
          pathname: route.path,
          params: params || {},
          parent: $ownerRoute ? $ownerRoute() : undefined,
        };
        $activeRoute(currentRoute);
        //console.log($activeRoute());
        if (props.onChange) props.onChange(currentRoute);
      }
    };
    const onPopstate = () => {
      updateActiveRoute(
        matchRoutes($ownerRoute ? $ownerRoute() : undefined, router, routes)
      );
    };
    router.addEventListener("popstate", onPopstate);
    updateActiveRoute(
      matchRoutes($ownerRoute ? $ownerRoute() : undefined, router, routes)
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
      };
    }
  }

  // Return null if no matching route is found
  return undefined;
}

export const BrowserRouter = component(
  "alfama-router.Browser",
  (props, { setContext, signal }) => {
    setContext(
      RouterContext,
      signal("router", createRouter(window.history, window.location))
    );
    return props.children;
  }
);

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
        const r = $router();
        const href =
          typeof props.href === "function" ? props.href() : props.href;
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
