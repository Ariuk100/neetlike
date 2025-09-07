import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['mn', 'en'],
 
  // Used when no locale matches
  defaultLocale: 'mn',
  
  // The `pathnames` object holds pairs of internal and
  // external pathnames. Based on the locale, the
  // external pathnames are rewritten to the shared,
  // internal pathnames.
  pathnames: {
    // If all locales use the same pathname, a single
    // external pathname can be provided.
    '/': '/',
    '/about': {
      mn: '/taniltsuulga',
      en: '/about'
    },
    '/tests': {
      mn: '/testud',
      en: '/tests'
    },
    '/dashboard': {
      mn: '/kholboos',
      en: '/dashboard'
    },
    '/profile': {
      mn: '/profile',
      en: '/profile'
    },
    '/settings': {
      mn: '/tohirguud',
      en: '/settings'
    },
    '/help': {
      mn: '/tuslaltsaa',
      en: '/help'
    },
    '/contact': {
      mn: '/kholboo',
      en: '/contact'
    }
  }
});
 
// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const {Link, redirect, usePathname, useRouter} =
  createNavigation(routing);