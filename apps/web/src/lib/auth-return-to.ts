const applicationPathPattern = /^\/applications\/\d+$/;
type AuthLocation = { pathname: string; search: string; hash: string };

function isApprovedPath(pathname: string) {
  if (applicationPathPattern.test(pathname)) {
    return true;
  }

  switch (pathname) {
    case "/":
    case "/archive":
    case "/blacklist":
    case "/settings": {
      return true;
    }
    default: {
      return false;
    }
  }
}

export function resolveAuthReturnTo(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  const target = new URL(value, window.location.origin);
  if (target.origin !== window.location.origin || !isApprovedPath(target.pathname)) {
    return "/";
  }

  return `${target.pathname}${target.search}${target.hash}`;
}

export function getAuthLink(pathname: "/login" | "/register", location: AuthLocation) {
  const returnTo = resolveAuthReturnTo(`${location.pathname}${location.search}${location.hash}`);
  if (returnTo === "/") {
    return pathname;
  }

  return `${pathname}?returnTo=${encodeURIComponent(returnTo)}`;
}
