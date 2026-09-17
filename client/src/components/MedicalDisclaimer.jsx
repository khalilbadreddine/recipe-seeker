import React from 'react'
import { Link } from 'react-router-dom'

/** Short YMYL strip shown on every nutrition page. Full text lives at /disclaimer. */
export default function MedicalDisclaimer() {
  return (
    <aside className="rounded-2xl border border-forest-line bg-forest-soft px-5 py-4 text-sm leading-relaxed text-forest/90">
      <p>
        <strong className="font-semibold">General information only.</strong> Nutrition content on this
        site is for general information and is not medical advice, diagnosis or treatment. Nutrient
        values are estimates. If you have a health condition or suspect a deficiency, talk to your
        doctor or a registered dietitian.{' '}
        <Link to="/disclaimer" className="underline decoration-ember/60 underline-offset-2 font-medium">
          Read our full disclaimer
        </Link>
        .
      </p>
    </aside>
  )
}
