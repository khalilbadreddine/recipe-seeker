import React from 'react'
import Seo from '../components/Seo'
import JsonLd from '../components/JsonLd'
import MedicalDisclaimer from '../components/MedicalDisclaimer'
import Reveal from '../components/Reveal'
import { absUrl, absImage } from '../data/site'
import { AUTHOR, AUTHOR_PERSON_LD } from '../data/author'

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
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <Reveal variant="scale" immediate>
            <img
              src={AUTHOR.photo}
              alt={`${AUTHOR.name}, ${AUTHOR.role}, in her kitchen`}
              width={480}
              height={600}
              className="aspect-[4/5] w-56 rounded-[2rem] object-cover shadow-[0_24px_60px_rgba(30,70,51,0.18)] ring-2 ring-forest-soft sm:w-64"
            />
          </Reveal>
          <Reveal as="h1" immediate variant="up" delay={120} className="mt-6 font-display text-4xl font-semibold text-forest sm:text-5xl">
            Hi, I'm {AUTHOR.name}
          </Reveal>
          <Reveal as="p" immediate variant="up" delay={200} className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-ember-dark">
            {AUTHOR.role}
          </Reveal>
        </div>

        <Reveal variant="up" className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-forest">My low-iron journey</h2>
          <p className="mt-3 leading-relaxed text-forest/80">
            In my mid-20s I was exhausted all the time. Not the "I need a nap" kind of tired. The
            "my bones feel heavy" kind. My doctor ran bloodwork and my iron came back low. Suddenly a
            lot made sense.
          </p>
          <p className="mt-4 leading-relaxed text-forest/80">
            But the practical part is where I got stuck. The advice was "eat more iron-rich foods,"
            which sounded simple until I was standing in a grocery store wondering what that actually
            means for dinner. So I started learning: which foods are rich in iron, how vitamin C
            helps the body absorb it, and most importantly, how to cook those meals so they'd be
            things I genuinely wanted to eat again. Not bland. Not punishment food. Just dinner.
            Good dinner. Food that happened to be packed with iron.
          </p>
          <p className="mt-4 leading-relaxed text-forest/80">
            I won't pretend to be something I'm not: <strong className="text-forest">I'm not a
            doctor, dietitian, or nutritionist.</strong> I'm someone who learned to cook for her own
            body and kept going, because it turned out a lot of people are standing in that same
            grocery store wondering the same thing.
          </p>
        </Reveal>

        <Reveal variant="up" className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-forest">What this site is</h2>
          <p className="mt-3 leading-relaxed text-forest/80">
            The Recipe Seeker flips the usual recipe search on its head. Most sites start with
            cravings; we start with your body. You search by the nutrients you actually need:
            protein for recovery, iron for energy, fiber for gut health. And you get recipes built around
            them, each with honest per-serving nutrition so you can see exactly what you're getting.
          </p>
          <p className="mt-4 leading-relaxed text-forest/80">
            My job here is recipe developer: I create and test the recipes, make them practical for
            busy people, and compute their nutrition from USDA data. Every published recipe goes
            through the same checks: it must taste great, use accessible ingredients, and deliver a
            meaningful amount of its headline nutrient per serving.
          </p>
        </Reveal>

        <Reveal variant="up" className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-forest">How we compute nutrition</h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 text-forest/80 marker:text-ember">
            <li>
              <strong className="text-forest">USDA FoodData Central sourcing.</strong> Nutrient values
              for each ingredient come from the USDA FoodData Central database, the reference standard
              for US food composition data.
            </li>
            <li>
              <strong className="text-forest">Per-serving computation.</strong> We total the nutrients
              across the full ingredient list and divide by the stated number of servings. Values are
              estimates. Your exact ingredients and portions will vary slightly.
            </li>
            <li>
              <strong className="text-forest">Daily values.</strong> Percent Daily Values use the FDA's
              reference values for a 2,000-calorie diet (e.g. 50g protein, 18mg iron, 28g fiber).
            </li>
            <li>
              <strong className="text-forest">No disease claims.</strong> We describe what nutrients do
              and how much is in the food. We never claim a recipe treats, cures or prevents disease.
            </li>
          </ul>
        </Reveal>

        <Reveal variant="up" className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-forest">Contact</h2>
          <p className="mt-3 leading-relaxed text-forest/80">
            Questions, corrections or partnership ideas? Email us at{' '}
            <span className="font-medium text-forest">hello@therecipeseeker.com</span>{' '}
            <span className="text-forest/75">(placeholder: contact form coming soon)</span>.
          </p>
        </Reveal>

        <div className="mt-10">
          <MedicalDisclaimer />
        </div>
      </article>
    </>
  )
}
