"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { VerticalId } from "@/components/tool-card";

const EASE = [0.16, 1, 0.3, 1] as const;

const FormSchema = z.object({
  email: z.string().min(1, "Work email is required").email("Enter a valid work email"),
  name: z.string().trim().min(2, "Enter your full name"),
  company: z.string().trim().min(2, "Enter your company"),
  challenge: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof FormSchema>;

const fieldClass =
  "h-12 w-full rounded-xl border border-transparent bg-white px-4 text-[15px] text-ink outline-none transition-shadow duration-300 placeholder:text-ink-muted/60 focus:shadow-[0_0_0_3px_rgba(255,194,34,0.5)]";

const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-white/70";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs font-medium text-st-gold">{msg}</p>;
}

export function LeadForm({
  vertical,
  verticalLabel,
  language,
  sourceText,
  score,
  readiness,
  onReset,
}: {
  vertical: VerticalId;
  verticalLabel: string;
  language: string;
  sourceText: string;
  score: number;
  readiness: string;
  onReset: () => void;
}) {
  const reduced = useReducedMotion();
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    mode: "onChange",
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          analysis: { score, readiness, vertical, language, sourceText },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      setSubmitted(values.email);
    } catch {
      setServerError("Couldn’t reach the server. Try again.");
    }
  };

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mt-10 overflow-hidden rounded-2xl bg-st-blue p-8 shadow-[0_20px_50px_-24px_rgba(0,82,155,0.6)] sm:p-14"
    >
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="thanks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mx-auto max-w-lg py-6 text-center"
          >
            <svg
              viewBox="0 0 52 52"
              className="mx-auto h-14 w-14"
              fill="none"
              aria-hidden
            >
              <circle cx="26" cy="26" r="24" stroke="#60B070" strokeWidth="2.5" />
              <motion.path
                d="M15 27l7.5 7.5L37 20"
                stroke="#60B070"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
              />
            </svg>

            <h3
              className="mt-6 font-heading text-4xl text-white"
              style={{ fontWeight: 700 }}
            >
              Thank you.
            </h3>

            <p className="mx-auto mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-white/80">
              A certified {verticalLabel.toLowerCase()} linguist will reach out to{" "}
              <span className="font-medium text-white">{submitted}</span> within
              24 hours. Look for the subject line &ldquo;Your SimulTrans review
              plan.&rdquo;
            </p>

            <button
              type="button"
              onClick={onReset}
              className="group mt-7 inline-flex min-h-[44px] items-center text-sm font-semibold text-st-gold hover:underline"
            >
              Or run another analysis
              <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="grid grid-cols-1 gap-10 md:grid-cols-[2fr_3fr] md:gap-14"
          >
            {/* Pitch */}
            <div>
              <p className="eyebrow text-st-gold">This is where AI stops.</p>

              <h3
                className="mt-4 font-heading text-[34px] leading-[1.05] text-white sm:text-[42px]"
                style={{ fontWeight: 700 }}
              >
                Tell us about your project. We’ll be in touch soon with a plan
                and a quote.
              </h3>

              <p className="mt-5 text-pretty text-[15px] leading-relaxed text-white/80">
                The preview above is AI. A certified specialist in{" "}
                {verticalLabel.toLowerCase()} will review your content against
                everything AI cannot see, then be in touch within 24 hours with a
                review plan and same-day quote.
              </p>

              <p className="mt-6 text-[13px] font-medium text-white/70">
                ✓ No obligation · Response within 24 hours
              </p>
              <p className="mt-1.5 text-[13px] font-medium text-white/50">
                40 years · Trusted by Aerogen, Wiley
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="email">
                    Work email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    className={fieldClass}
                    {...register("email")}
                  />
                  <FieldError msg={errors.email?.message} />
                </div>

                <div>
                  <label className={labelClass} htmlFor="name">
                    Full name
                  </label>
                  <input
                    id="name"
                    autoComplete="name"
                    placeholder="Your name"
                    className={fieldClass}
                    {...register("name")}
                  />
                  <FieldError msg={errors.name?.message} />
                </div>

                <div>
                  <label className={labelClass} htmlFor="company">
                    Company
                  </label>
                  <input
                    id="company"
                    autoComplete="organization"
                    placeholder="Company name"
                    className={fieldClass}
                    {...register("company")}
                  />
                  <FieldError msg={errors.company?.message} />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="challenge">
                    Biggest translation challenge?
                  </label>
                  <textarea
                    id="challenge"
                    placeholder="Optional"
                    className={`${fieldClass} min-h-[80px] resize-y py-3 leading-relaxed`}
                    style={{ height: "auto" }}
                    {...register("challenge")}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="group relative mt-6 inline-flex h-[52px] w-full items-center justify-center overflow-hidden rounded-xl bg-white px-6 text-[15px] font-semibold text-st-blue transition enabled:hover:brightness-105 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    Submitting…
                    <span className="shimmer-bar absolute inset-x-0 bottom-0 h-0.5" />
                  </>
                ) : (
                  <>
                    Request a SimulTrans linguist review
                    <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-enabled:group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-medium text-white/70">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                No obligation quote
              </p>

              {serverError && (
                <p className="mt-3 text-center text-xs text-st-gold">
                  {serverError}
                </p>
              )}

              <p className="mt-4 text-pretty text-center text-[11px] font-medium leading-relaxed text-white/60">
                Nothing is shared publicly. GDPR compliant. You&rsquo;ll only hear
                from a real person.
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
