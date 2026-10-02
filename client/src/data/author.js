import { SITE_URL, absUrl } from './site'

/**
 * Who writes the site. Single source of truth for bylines and structured data.
 *
 * HONESTY RULE (YMYL): the site speaks as a brand, "The Recipe Seeker Kitchen".
 * No invented people, no invented personal health stories, and no claim that a
 * recipe was cooked or tested unless the recipe carries kitchenTested: true.
 * We are not doctors or dietitians and never imply medical credentials.
 *
 * To publish under a real person instead, change name/role/bio here (and add a
 * real photo), then switch AUTHOR_LD to a schema.org Person.
 */
export const AUTHOR = {
  name: 'The Recipe Seeker Kitchen',
  role: 'Recipe curation & USDA nutrition data',
  url: absUrl('/about'),
  oneLineBio:
    'We curate and adapt practical recipes and calculate their nutrition per serving from USDA FoodData Central, honestly and without health hype.',
}

/** schema.org author/publisher for articles and recipes. */
export const AUTHOR_LD = {
  '@type': 'Organization',
  name: 'The Recipe Seeker',
  url: SITE_URL,
  logo: absUrl('/apple-touch-icon.png'),
}
