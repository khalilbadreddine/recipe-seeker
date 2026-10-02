import React from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import MedicalDisclaimer from '../components/MedicalDisclaimer'
import Reveal from '../components/Reveal'
import Icon from '../components/Icon'
import { absUrl, absImage, recipes, nutrients } from '../data/site'
import { AUTHOR, AUTHOR_PERSON_LD } from '../data/author'

const METHOD = [
  {
    icon: 'book',
    title: 'USDA FoodData Central sourcing.',
    text: 'Nutrient values for each ingredient come from the USDA FoodData Central database, the reference standard for US food composition data.',
  },
  {
    icon: 'scale',
    title: 'Per-serving computation.',
    text: 'We total the nutrients across the full ingredient list and divide by the stated number of servings. Values are estimates. Your exact ingredients and portions will vary slightly.',
  },
  {
    icon: 'grid',
    title: 'Daily values.',
    text: "Percent Daily Values use the FDA's reference values for a 2,000-calorie diet (e.g. 50g protein, 18mg iron, 28g fiber).",
  },
  {
    icon: 'info',
    title: 'No disease claims.',
    text: 'We describe what nutrients do and how much is in the food. We never claim a recipe treats, cures or prevents disease.',
  },
]

export default function AboutPage() {
  const canonical = absUrl('/about')
  return (
    <>
      <Seo
        title="About Emily Carter | The Recipe Seeker"
        description="Meet Emily Carter, recipe developer & nutrition enthusiast. Her low-iron journey in her mid-20s is why The Recipe Seeker cooks for nutrients first, honestly and with no medical claims."
        canonical={canonical}
        image={absImage('/images/author.webp')}
      />
      <JsonLd data={AUTHOR_PERSON_LD} />

      <article className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal variant="scale" immediate className="relative mx-auto w-full max-w-sm">
            <img
              src={AUTHOR.photo}
              alt={`${AUTHOR.name}, ${AUTHOR.role}, in her kitchen`}
              width={480}
              height={600}
              className="aspect-[4/5] w-full rounded-[2rem] object-cover"
            />
            <span style={{ '--r': '-4deg' }} className="float-slow absolute -bottom-5 -right-3 -rotate-[4deg] rounded-2xl bg-zest px-4 py-3 font-display text-lg font-bold text-ink shadow-[var(--shadow-lift)]">
              {recipes.length} recipes & counting
            </span>
          </Reveal>
          <div>
            <Reveal as="p" immediate variant="up" className="text-xs font-bold uppercase tracking-[0.18em] text-leaf-dark">
              {AUTHOR.role}
            </Reveal>
            <Reveal as="h1" immediate variant="up" delay={60} className="mt-3 font-display text-5xl font-extrabold leading-[1.02] text-ink sm:text-7xl">
              Hi, I’m {AUTHOR.name}
            </Reveal>
            <Reveal as="p" immediate variant="up" delay={120} className="mt-5 max-w-2xl text-xl leading-relaxed text-ink/70">
              {AUTHOR.oneLineBio}
            </Reveal>
            <Reveal immediate variant="up" delay={180} className="mt-8 flex flex-wrap gap-3">
              <Link to="/recipes" className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-ink px-6 font-semibold text-paper hover:bg-leaf-dark">
                Browse the recipes <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
              <Link to="/contact" className="inline-flex min-h-[48px] items-center rounded-full border border-line bg-card px-6 font-semibold text-ink hover:border-ink/30">
                Say hello
              </Link>
            </Reveal>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-3xl">
          <Reveal variant="up" as="section">
            <h2 className="font-display text-3xl font-extrabold text-ink">My low-iron journey</h2>
            <div className="prose-body text-lg">
              <p>
                In my mid-20s I was exhausted all the time. Not the "I need a nap" kind of tired. The
                "my bones feel heavy" kind. My doctor ran bloodwork and my iron came back low. Suddenly a
                lot made sense.
              </p>
              <p>
                But the practical part is where I got stuck. The advice was "eat more iron-rich foods,"
                which sounded simple until I was standing in a grocery store wondering what that actually
                means for dinner. So I started learning: which foods are rich in iron, how vitamin C
                helps the body absorb it, and most importantly, how to cook those meals so they'd be
                things I genuinely wanted to eat again. Not bland. Not punishment food. Just dinner.
                Good dinner. Food that happened to be packed with iron.
              </p>
            </div>
            <p className="mt-6 rounded-3xl bg-zest-soft px-6 py-5 text-lg leading-relaxed text-ink/85">
              I won't pretend to be something I'm not: <strong className="text-ink">I'm not a
              doctor, dietitian, or nutritionist.</strong> I'm someone who learned to cook for her own
              body and kept going, because it turned out a lot of people are standing in that same
              grocery store wondering the same thing.
            </p>
          </Reveal>

          <Reveal variant="up" as="section" className="mt-14">
            <h2 className="font-display text-3xl font-extrabold text-ink">What this site is</h2>
            <div className="prose-body text-lg">
              <p>
                The Recipe Seeker flips the usual recipe search on its head. Most sites start with
                cravings; we start with your body. You search by the nutrients you actually need:
                protein for recovery, iron for energy, fiber for gut health. And you get recipes built around
                them, each with honest per-serving nutrition so you can see exactly what you're getting.
              </p>
              <p>
                My job here is recipe developer: I create and test the recipes, make them practical for
                busy people, and compute their nutrition from USDA data. Every published recipe goes
                through the same checks: it must taste great, use accessible ingredients, and deliver a
                meaningful amount of its headline nutrient per serving.
              </p>
            </div>
          </Reveal>
        </div>

        <section className="mt-20 rounded-[2rem] bg-ink px-6 py-12 text-paper sm:px-12 sm:py-16" aria-labelledby="method-heading">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zest">Our method</p>
          <h2 id="method-heading" className="mt-3 font-display text-4xl font-extrabold">How we compute nutrition</h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {METHOD.map((m) => (
              <li key={m.title} className="flex gap-4 rounded-3xl bg-paper/5 p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zest text-ink">
                  <Icon name={m.icon} className="h-5 w-5" />
                </span>
                <span>
                  <strong className="block font-display text-xl font-bold">{m.title}</strong>
                  <span className="mt-1.5 block leading-relaxed text-paper/70">{m.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-paper/60">
            {recipes.length} recipes · {nutrients.length} nutrient hubs · every number per serving
          </p>
        </section>

        <div className="mx-auto mt-14 max-w-3xl">
          <section>
            <h2 className="font-display text-3xl font-extrabold text-ink">Contact</h2>
            <p className="mt-3 text-lg leading-relaxed text-ink/75">
              Questions, corrections or partnership ideas? Use the{' '}
              <Link to="/contact" className="font-semibold text-ink underline decoration-zest decoration-[3px] underline-offset-4">contact page</Link>{' '}
              or email <span className="font-medium text-ink">hello@therecipeseeker.com</span>{' '}
              <span className="text-ink/55">(placeholder address)</span>.
            </p>
          </section>
          <div className="mt-10">
            <MedicalDisclaimer />
          </div>
        </div>
      </article>
    </>
  )
}
