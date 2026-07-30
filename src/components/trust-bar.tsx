/**
 * Trust strip, directly below the hero. The sector pills that used to sit here
 * were dropped: they read as a second set of content-type pickers next to the
 * tool card's Medical / Legal / Marketing / Software radiogroup.
 */
export function TrustBar() {
  return (
    <section className="border-y border-line bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8 text-center">
        <p className="mx-auto max-w-3xl text-[15px] leading-relaxed text-ink">
          Trusted by translation buyers in medical, legal, marketing and software
          sectors, for over 40 years.
        </p>
      </div>
    </section>
  );
}
