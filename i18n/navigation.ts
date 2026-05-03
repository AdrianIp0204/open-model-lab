import { createNavigation } from "next-intl/navigation";
import { createElement, forwardRef, type ComponentPropsWithoutRef } from "react";

import { getPathLocale, stripLocalePrefix, routing } from "./routing";

const navigation = createNavigation(routing);
const BaseLink = navigation.Link;

type NavigationLinkProps = ComponentPropsWithoutRef<typeof BaseLink>;

type NormalizedLinkTarget = {
  href: NavigationLinkProps["href"];
  locale: NavigationLinkProps["locale"];
};

function splitPathnameSuffix(pathname: string) {
  const hashStart = pathname.indexOf("#");
  const pathAndSearch = hashStart >= 0 ? pathname.slice(0, hashStart) : pathname;
  const hash = hashStart >= 0 ? pathname.slice(hashStart) : "";
  const searchStart = pathAndSearch.indexOf("?");
  const path = searchStart >= 0 ? pathAndSearch.slice(0, searchStart) : pathAndSearch;
  const search = searchStart >= 0 ? pathAndSearch.slice(searchStart) : "";

  return { path, suffix: `${search}${hash}` };
}

function normalizePrefixedPathname(
  pathname: string,
  locale: NavigationLinkProps["locale"],
) {
  const { path, suffix } = splitPathnameSuffix(pathname);
  const pathLocale = getPathLocale(path);

  if (!pathLocale) {
    return null;
  }

  return {
    pathname: `${stripLocalePrefix(path)}${suffix}`,
    locale: locale ?? pathLocale,
  };
}

function normalizeLocalizedHref(
  href: NavigationLinkProps["href"],
  locale: NavigationLinkProps["locale"],
): NormalizedLinkTarget {
  if (typeof href === "string") {
    const normalized = normalizePrefixedPathname(href, locale);

    return normalized
      ? { href: normalized.pathname, locale: normalized.locale }
      : { href, locale };
  }

  if (href && typeof href === "object" && typeof href.pathname === "string") {
    const normalized = normalizePrefixedPathname(href.pathname, locale);

    return normalized
      ? {
          href: {
            ...href,
            pathname: normalized.pathname,
          },
          locale: normalized.locale,
        }
      : { href, locale };
  }

  return { href, locale };
}

export const Link = forwardRef<HTMLAnchorElement, NavigationLinkProps>(
  function LocaleAwareLink({ href, locale, ...props }, ref) {
    const normalized = normalizeLocalizedHref(href, locale);

    return createElement(BaseLink, {
      ...props,
      ref,
      href: normalized.href,
      locale: normalized.locale,
    });
  },
) as typeof BaseLink;

export const { redirect, getPathname, usePathname, useRouter } = navigation;
