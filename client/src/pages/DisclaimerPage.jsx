import React from 'react'
import Seo from '../components/Seo'
import { absUrl } from '../data/site'

export default function DisclaimerPage() {
  const canonical = absUrl('/disclaimer')
  return (
    <>
      <Seo
        title="Medical Disclaimer | The Recipe Seeker"
        description="The Recipe Seeker provides general nutrition information only — not medical advice. Read our full medical disclaimer."
        canonical={canonical}
      />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl font-semibold text-forest sm:text-5xl">Medical Disclaimer</h1>
        <p className="mt-3 text-sm text-forest/75">Last updated: September 2026</p>

        <div className="mt-6 space-y-6 leading-relaxed text-forest/80">
          <p>
            The content on The Recipe Seeker — including recipes, nutrient information, articles and
            guides — is provided for <strong className="text-forest">general informational purposes
            only</strong>. It is not medical advice, diagnosis or treatment, and it is not a
            substitute for professional medical guidance.
          </p>
          <h2 className="font-display text-2xl font-semibold text-forest">Talk to a professional</h2>
          <p>
            Always seek the advice of your physician, a registered dietitian or another qualified
            health provider with any questions about a medical condition, a suspected nutrient
            deficiency, or changes to your diet. Never disregard professional medical advice or
            delay seeking it because of something you read on this site.
          </p>
          <h2 className="font-display text-2xl font-semibold text-forest">Nutrient values are estimates</h2>
          <p>
            Per-serving nutrition values are computed from USDA FoodData Central data and the
            ingredient lists as written. Actual values vary with brands, substitutions, ripeness,
            cooking methods and portion sizes. Percent Daily Values are based on a 2,000-calorie
            diet and FDA reference values; your needs may differ.
          </p>
          <h2 className="font-display text-2xl font-semibold text-forest">No disease claims</h2>
          <p>
            Nothing on this site claims that any recipe, food or nutrient diagnoses, treats, cures
            or prevents any disease. Deficiency-related content describes general nutrition
            information only — only proper medical testing can diagnose a deficiency.
          </p>
          <h2 className="font-display text-2xl font-semibold text-forest">Allergies and intolerances</h2>
          <p>
            Recipes may contain common allergens. Always check ingredient labels yourself, and if
            you have a food allergy or intolerance, verify every ingredient before cooking.
          </p>
          <h2 className="font-display text-2xl font-semibold text-forest">Limitation of liability</h2>
          <p>
            Your use of this site and your reliance on its content is at your own risk. The Recipe
            Seeker is not liable for any outcome resulting from the use of the recipes or
            information provided here.
          </p>
        </div>
      </article>
    </>
  )
}
