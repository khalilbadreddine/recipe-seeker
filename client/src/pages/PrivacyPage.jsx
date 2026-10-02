import React from 'react'
import Seo from '../components/Seo'
import { absUrl } from '../data/site'

export default function PrivacyPage() {
  const canonical = absUrl('/privacy')
  return (
    <>
      <Seo
        title="Privacy Policy | The Recipe Seeker"
        description="Our privacy policy in plain language: what data we collect, how analytics works without cookies, and how to ask us to delete your data."
        canonical={canonical}
      />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl font-semibold text-forest sm:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-forest/75">Last updated: October 2026</p>

        <div className="mt-6 space-y-6 leading-relaxed text-forest/80">
          <p>
            We keep this simple on purpose: The Recipe Seeker doesn't track you, doesn't sell your
            data, and doesn't use tracking cookies. Here's exactly what happens when you visit.
          </p>

          <h2 className="font-display text-2xl font-semibold text-forest">What we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-forest">Anonymous visit stats.</strong> We use Vercel Web
              Analytics to count page views. It works without cookies and doesn't store IP
              addresses, track you across sites or build a profile of you.
            </li>
            <li>
              <strong className="text-forest">Your email address, only if you subscribe.</strong>{' '}
              We store it to send you new recipes (via our email provider). Every email has a
              one-click unsubscribe link.
            </li>
            <li>
              <strong className="text-forest">Questions the chat couldn't answer.</strong> When the
              “Ask Seeker” chat can't find a good recipe for a question, we save that question's
              text (with anything that looks like an email or phone number removed, and no IP
              address or account) so we know which recipes to add next. Please don't type
              personal or medical details into the chat. Chat questions are processed by an AI
              provider to write the answer.
            </li>
            <li>
              <strong className="text-forest">Ratings, if you're signed in.</strong> When you rate
              a recipe we store your rating with your account. Only the total count and average
              are ever shown publicly.
            </li>
          </ul>

          <h2 className="font-display text-2xl font-semibold text-forest">Accounts &amp; your data</h2>
          <p>
            You can browse every recipe without an account. If you choose to sign in with
            Google, we store the basics Google shares with us — your name, email address and
            profile picture — plus what you save on the site: your favorite recipes, your
            weekly meal plans and your recipe ratings. That's all we keep, and it's only used to show your
            stuff back to you on any device.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-forest">Your data is private to you.</strong> Our database
              rules mean a signed-in user can only ever see their own saved recipes and meal
              plans — never anyone else's.
            </li>
            <li>
              <strong className="text-forest">No tracking cookies.</strong> Staying signed in
              uses your browser's local storage on your own device, not advertising cookies.
            </li>
            <li>
              <strong className="text-forest">Data location.</strong> Account data lives in our
              Supabase database (hosted in the US). Google handles the actual sign-in — we never
              see or store your Google password.
            </li>
            <li>
              <strong className="text-forest">Deletion.</strong> Email{' '}
              <a href="mailto:hello@therecipeseeker.com" className="font-medium text-ember underline hover:text-ember-dark">
                hello@therecipeseeker.com
              </a>{' '}
              from the address you signed in with and we'll delete your account data.
              Signing out alone doesn't delete anything — your saved recipes stay for next time.
            </li>
          </ul>

          <h2 className="font-display text-2xl font-semibold text-forest">What we never do</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>We never sell, rent or trade your personal data to anyone.</li>
            <li>We never share your email address with advertisers or third parties.</li>
            <li>We never run cross-site trackers or build advertising profiles.</li>
          </ul>

          <h2 className="font-display text-2xl font-semibold text-forest">Cookies</h2>
          <p>
            We don't use tracking cookies. There is no cookie banner on this site because there is
            nothing to consent to — our analytics works without them.
          </p>

          <h2 className="font-display text-2xl font-semibold text-forest">Your rights</h2>
          <p>
            You can ask us at any time to see, correct or delete the personal data we hold about
            you — for example, to remove your email address from the newsletter list. Just email{' '}
            <a href="mailto:hello@therecipeseeker.com" className="font-medium text-ember underline hover:text-ember-dark">
              hello@therecipeseeker.com
            </a>{' '}
            and we'll take care of it.
          </p>

          <h2 className="font-display text-2xl font-semibold text-forest">Changes to this policy</h2>
          <p>
            If this policy changes, we'll update this page and the "last updated" date above.
          </p>
        </div>
      </article>
    </>
  )
}
