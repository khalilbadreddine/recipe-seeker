import React from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

/** Short YMYL strip shown on every nutrition page. Full text lives at /disclaimer. */
export default function MedicalDisclaimer() {
  return (
    <aside className="flex gap-3 rounded-2xl border border-line bg-mist px-5 py-4 text-sm leading-relaxed text-ink/75">
      <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-ink/50" />
      <p>
        <strong className="font-semibold text-ink">General information only.</strong> Nutrition content on this
        site is for general information and is not medical advice, diagnosis or treatment. Nutrient
        values are estimates. If you have a health condition or suspect a deficiency, talk to your
        doctor or a registered dietitian.{' '}
        <Link to="/disclaimer" className="font-medium text-ink underline underline-offset-2">
          Read our full disclaimer
        </Link>
        .
      </p>
    </aside>
  )
}
