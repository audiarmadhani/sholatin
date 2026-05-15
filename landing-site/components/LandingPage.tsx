'use client'

import { ReactLenis, useLenis } from 'lenis/react'
import { useRef } from 'react'

import { MarketingThemeProvider, useMarketingTheme } from '@/components/MarketingThemeProvider'
import styles from '@/components/landing.module.css'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const IOS_URL = process.env.NEXT_PUBLIC_APP_STORE_URL
const ANDROID_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL

function ParallaxDriver({
  ornamentRef,
  leftRef,
  rightRef,
}: {
  ornamentRef: React.RefObject<HTMLDivElement | null>
  leftRef: React.RefObject<HTMLDivElement | null>
  rightRef: React.RefObject<HTMLDivElement | null>
}) {
  useLenis((lenis) => {
    const y = lenis.scroll
    const o = ornamentRef.current
    const l = leftRef.current
    const r = rightRef.current
    if (o) o.style.transform = `translate3d(0, ${y * 0.07}px, 0)`
    if (l) l.style.transform = `translate3d(0, ${y * -0.05}px, 0)`
    if (r) r.style.transform = `translate3d(0, ${y * -0.12}px, 0)`
  }, [])
  return null
}

function LandingInner() {
  const { scheme, toggle } = useMarketingTheme()
  const reducedMotion = usePrefersReducedMotion()
  const ornamentRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  const content = (
    <div className={styles.wrapper}>
      <header className={styles.hero}>
        <div className={styles.dots} aria-hidden />
        <nav className={`${styles.nav} shFadeBase shFadeDelay1`}>
          <span className={styles.logo}>Sholatin</span>
          <div className={styles.navGrow} aria-hidden />
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>
              Features
            </a>
            <a href="#how" className={styles.navLink}>
              How it works
            </a>
            <a href="#depth" className={styles.navLink}>
              Product
            </a>
            <a href="#faq" className={styles.navLink}>
              FAQ
            </a>
          </div>
          <div className={styles.navActions}>
            <button
              type="button"
              className={styles.themeBtn}
              onClick={toggle}
              aria-label={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {scheme === 'dark' ? '☀︎' : '☾'}
            </button>
          </div>
        </nav>

        <div className={styles.heroInner}>
          <p className={`${styles.kicker} shFadeBase shFadeDelay1`}>Prayer rhythm</p>
          <h1 className={`${styles.headline} shFadeBase shFadeDelay2`}>
            Calm salah tracking, one gentle day at a time.
          </h1>
          <p className={`${styles.sub} shFadeBase shFadeDelay3`}>
            Sholatin helps you stay in rhythm with adhān-based windows, soft XP, and a living
            landscape that grows with your consistency — without the noise.
          </p>
          <div className={`${styles.ctaRow} shFadeBase shFadeDelay4`}>
            {IOS_URL ? (
              <a className={styles.primaryCta} href={IOS_URL} rel="noopener noreferrer" target="_blank">
                App Store
              </a>
            ) : null}
            {ANDROID_URL ? (
              <a
                className={styles.secondaryCta}
                href={ANDROID_URL}
                rel="noopener noreferrer"
                target="_blank">
                Google Play
              </a>
            ) : null}
            {!IOS_URL && !ANDROID_URL ? (
              <span className={styles.secondaryCta} style={{ cursor: 'default', opacity: 0.85 }}>
                Mobile app links coming soon
              </span>
            ) : null}
          </div>

          <div className={styles.heroVisual} aria-hidden>
            <div ref={ornamentRef} className={styles.ornament} />
            <div className={styles.cardWrapLeft}>
              <div ref={leftRef} className={styles.cardParallax}>
                <div className={styles.card}>
                  <div className={styles.cardLabel}>Gentle pace</div>
                  <div className={styles.cardStat}>+XP</div>
                  <div className={styles.cardHint}>Log within the window for bonus harmony.</div>
                </div>
              </div>
            </div>
            <div className={styles.cardWrapRight}>
              <div ref={rightRef} className={styles.cardParallax}>
                <div className={styles.card}>
                  <div className={styles.cardLabel}>Landscape</div>
                  <div className={styles.cardStat}>∞</div>
                  <div className={styles.cardHint}>Unlock layers as your month unfolds.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="features" className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionKicker}>Why Sholatin</p>
          <h2 className={styles.sectionTitle}>Built for focus</h2>
          <p className={styles.sectionLead}>
            Whether you are balancing work, family, or travel, the app keeps the day legible: one
            clear next step, honest windows around adhān, and a scene that rewards steadiness — not
            streak anxiety.
          </p>
          <div className={styles.grid}>
            <article className={styles.feature}>
              <h3>Adhān-aware logging</h3>
              <p>Know exactly when gentle windows open so logging stays fair and peaceful.</p>
            </article>
            <article className={styles.feature}>
              <h3>Living scene</h3>
              <p>Your monthly rhythm wakes the landscape — small wins, visible growth.</p>
            </article>
            <article className={styles.feature}>
              <h3>Privacy-minded</h3>
              <p>Optional anonymous comparisons; your practice stays yours.</p>
            </article>
            <article className={styles.feature}>
              <h3>Location-aware times</h3>
              <p>Uses your saved place to refresh timings and keep reminders aligned with your day.</p>
            </article>
            <article className={styles.feature}>
              <h3>Month map, not guilt</h3>
              <p>XP is framed as harmony: enough structure to improve, enough softness to miss a day.</p>
            </article>
            <article className={styles.feature}>
              <h3>Soundscapes</h3>
              <p>Optional ambient audio that responds to your landscape state — calm, not arcadey.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="how" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInnerWide}>
          <p className={styles.sectionKicker}>Flow</p>
          <h2 className={styles.sectionTitle}>How a typical day feels</h2>
          <p className={styles.sectionLead}>
            No dashboards to babysit. You open Sholatin, glance at the countdown or focus card, log
            when the window is right, and let the scene absorb the win.
          </p>
          <ol className={styles.steps}>
            <li className={styles.step}>
              <div>
                <h3>Morning check-in</h3>
                <p>
                  See today&apos;s rhythm: what is next, what is already logged, and how much gentle
                  time remains before the next milestone.
                </p>
              </div>
            </li>
            <li className={styles.step}>
              <div>
                <h3>At adhān</h3>
                <p>
                  Logging opens at the official time. During the bonus window you get extra harmony
                  XP — a nudge, not a whip.
                </p>
              </div>
            </li>
            <li className={styles.step}>
              <div>
                <h3>One-tap log</h3>
                <p>
                  Tap the docked action to record the prayer with the right tier for when you
                  actually stood for salah.
                </p>
              </div>
            </li>
            <li className={styles.step}>
              <div>
                <h3>Evening wind-down</h3>
                <p>
                  When everything is logged, the UI quiets down: a full scene, softer copy, and no
                  nagging prompts.
                </p>
              </div>
            </li>
          </ol>
          <div className={styles.statRow}>
            <div className={styles.stat}>
              <div className={styles.statValue}>5</div>
              <div className={styles.statLabel}>Daily prayers in rhythm</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>∞</div>
              <div className={styles.statLabel}>Landscape layers over months</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>1</div>
              <div className={styles.statLabel}>Gentle focus card at a time</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>0</div>
              <div className={styles.statLabel}>Leaderboards shaming you</div>
            </div>
          </div>
        </div>
      </section>

      <section id="depth" className={styles.section}>
        <div className={styles.sectionInnerWide}>
          <p className={styles.sectionKicker}>Under the calm UI</p>
          <h2 className={styles.sectionTitle}>Thoughtful defaults</h2>
          <p className={styles.sectionLead}>
            Sholatin is opinionated about tone: fewer badges, more breathing room, and copy that
            assumes good intent. Here is what that looks like in practice.
          </p>
          <div className={styles.split}>
            <div className={styles.splitProse}>
              <h3>Calculation methods</h3>
              <p>
                Pick a fiqh-friendly method during onboarding. The app stores it with your profile
                so refreshes stay consistent when you travel or reinstall.
              </p>
              <h3>Notifications you can trust</h3>
              <p>
                Reminders are capped and ordered: helpful pings without flooding every few minutes.
                You stay in control from Settings.
              </p>
            </div>
            <div className={styles.splitProse}>
              <h3>What we never optimize for</h3>
              <ul className={styles.bulletList}>
                <li>Vanity streaks that reset to zero and ruin your week.</li>
                <li>Noisy social feeds inside a worship context.</li>
                <li>Dark patterns to keep you staring past the point of khushūʿ.</li>
                <li>Paywalls on basic salah logging — the core stays generous.</li>
              </ul>
            </div>
          </div>
          <blockquote className={styles.quote}>
            <p>
              &ldquo;I wanted something that felt like a garden, not a scoreboard. The landscape growing
              with my month actually makes me want to come back.&rdquo;
            </p>
            <cite>— Early design feedback (paraphrased)</cite>
          </blockquote>
        </div>
      </section>

      <section id="faq" className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionKicker}>Questions</p>
          <h2 className={styles.sectionTitle}>FAQ</h2>
          <p className={styles.sectionLead}>
            Straight answers — scroll a little further for the final call-to-action band.
          </p>
          <div className={styles.faqList}>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQ}>Do I need an account?</h3>
              <p className={styles.faqA}>
                The mobile app keeps data on your device. There is no forced cloud login for core
                salah logging.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQ}>What if I miss a prayer?</h3>
              <p className={styles.faqA}>
                Logging reflects what you actually prayed. Missed prayers can be recorded honestly;
                the UI does not punish you with shame screens.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQ}>Does it work offline?</h3>
              <p className={styles.faqA}>
                After times are cached for your location, many flows work offline. Fresh coordinates
                still need connectivity to pull new calculations.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQ}>Is percentile ranking required?</h3>
              <p className={styles.faqA}>
                No. Weekly percentile snapshots are optional and anonymous. Opt in only if that
                comparison feels motivating, not stressful.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQ}>Who builds Sholatin?</h3>
              <p className={styles.faqA}>
                A small team focused on respectful UX for Muslims in busy daily life — not growth
                hacks, not engagement tricks.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.ctaBand} aria-labelledby="cta-final-heading">
        <div className={styles.ctaBandInner}>
          <h2 id="cta-final-heading">Ready when you are</h2>
          <p>
            Download the app when store links go live, or keep this page bookmarked — we will keep
            the same visual language when we ship updates.
          </p>
          <div className={styles.ctaRow}>
            {IOS_URL ? (
              <a className={styles.primaryCta} href={IOS_URL} rel="noopener noreferrer" target="_blank">
                App Store
              </a>
            ) : null}
            {ANDROID_URL ? (
              <a
                className={styles.secondaryCta}
                href={ANDROID_URL}
                rel="noopener noreferrer"
                target="_blank">
                Google Play
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>© {new Date().getFullYear()} Sholatin</footer>
    </div>
  )

  if (reducedMotion) {
    return content
  }

  return (
    <ReactLenis root options={{ autoRaf: true, lerp: 0.11, smoothWheel: true }}>
      <ParallaxDriver ornamentRef={ornamentRef} leftRef={leftRef} rightRef={rightRef} />
      {content}
    </ReactLenis>
  )
}

export default function LandingPage() {
  return (
    <MarketingThemeProvider>
      <LandingInner />
    </MarketingThemeProvider>
  )
}
