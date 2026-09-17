import { absUrl } from './site'

/**
 * The site's author persona. Single source of truth for name, role, photo and bio.
 *
 * HONESTY RULE (YMYL): Emily is a "recipe developer & nutrition enthusiast".
 * Never describe her as a dietitian, nutritionist with credentials, doctor,
 * or imply any medical credentials — not in copy and not in structured data.
 */
export const AUTHOR = {
  name: 'Emily Carter',
  role: 'Recipe developer & nutrition enthusiast',
  photo: '/images/author.webp',
  photoAbs: absUrl('/images/author.webp'),
  url: absUrl('/about'),
  oneLineBio:
    'I develop nutrition-first recipes that are delicious, practical, and honest about what they deliver per serving.',
}

export const AUTHOR_PERSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: AUTHOR.name,
  jobTitle: AUTHOR.role,
  description: AUTHOR.oneLineBio,
  image: AUTHOR.photoAbs,
  url: AUTHOR.url,
}
