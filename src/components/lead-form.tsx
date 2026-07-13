"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LEAD_ROLES, LEAD_VOLUMES } from "@/app/api/lead/route";
import type { VerticalId } from "@/components/tool-card";

const EASE = [0.16, 1, 0.3, 1] as const;

const FormSchema = z.object({
  email: z.string().min(1, "Work email is required").email("Enter a valid work email"),
  name: z.string().trim().min(2, "Enter your full name"),
  company: z.string().trim().min(2, "Enter your company"),
  role: z.enum(LEAD_ROLES, { message: "Select your role" }),
  volume: z.enum(LEAD_VOLUMES).optional(),
  challenge: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof FormSchema>;

const fieldClass =
  "h-12 w-full rounded-xl border border-transparent bg-[#fdf6ea] px-4 text-[15px] text-ink outline-none transition-shadow duration-300 placeholder:text-ink-muted/60 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.35)]";

const labelClass =
  "mb-1.5 block text-[11px] font-semibold tracking-[0.02em] text-cream/70";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-[#fdba74]">{msg}</p>;
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
      setServerError("Couldn't reach the server. Try again.");
    }
  };

  return (
    <motion.div
      initial={
        reduced
          ? { opacity: 0 }
          : { opacity: 0, y: 40, boxShadow: "0 0px 0px rgba(249,115,22,0)" }
      }
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: "0 20px 60px rgba(249,115,22,0.15)",
      }}
      transition={{ duration: 0.6, ease: EASE, delay: reduced ? 0.1 : 1.6 }}
      className="cta-parallax mt-10 overflow-hidden rounded-[20px] border-t-2 border-sunset bg-royal p-8 sm:p-14"
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
              <circle cx="26" cy="26" r="24" stroke="#059669" strokeWidth="2.5" />
              <motion.path
                d="M15 27l7.5 7.5L37 20"
                stroke="#059669"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
              />
            </svg>

            <h3 className="voice mt-6 text-4xl text-cream">Thank you.</h3>

            <p className="mx-auto mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-cream/80">
              A certified {verticalLabel.toLowerCase()} linguist will reach out
              to{" "}
              <span className="font-medium text-cream">{submitted}</span> within
              24 hours. Look for the subject line &ldquo;Your SimulTrans review
              plan.&rdquo;
            </p>

            <button
              type="button"
              onClick={onReset}
              className="group relative mt-7 min-h-[44px] text-sm font-medium text-sunset"
            >
              <span className="relative">
                Or run another analysis
                <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-sunset transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
              </span>
              <span className="ml-1 inline-block transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
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
              <p className="eyebrow text-sunset">
                Ready for a certified review?
              </p>

              <h3 className="mt-4 text-[32px] font-bold leading-[1.15] tracking-[-0.02em] text-cream sm:text-[40px]">
                Get this content{" "}
                <span className="voice">reviewed by a real linguist.</span>
              </h3>

              <p className="mt-5 text-pretty text-[15px] leading-relaxed text-cream/80">
                Tell us about your team. A specialist in{" "}
                {verticalLabel.toLowerCase()} will be in touch within 24 hours
                with a review plan and same-day quote.
              </p>

              <p className="mt-6 text-[13px] font-medium text-cream/70">
                ✓ ISO 17100 certified · No obligation · Response within 24 hours
              </p>
              <p className="mt-1.5 text-[13px] font-medium text-cream/50">
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

                <div>
                  <label className={labelClass} htmlFor="role">
                    Role
                  </label>
                  <select
                    id="role"
                    defaultValue=""
                    className={fieldClass}
                    {...register("role")}
                  >
                    <option value="" disabled>
                      Select your role
                    </option>
                    {LEAD_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <FieldError msg={errors.role?.message} />
                </div>

                <div>
                  <label className={labelClass} htmlFor="volume">
                    Content volume
                  </label>
                  <select
                    id="volume"
                    defaultValue=""
                    className={fieldClass}
                    {...register("volume")}
                  >
                    <option value="">Select volume</option>
                    {LEAD_VOLUMES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
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
                className="group relative mt-6 h-[52px] w-full overflow-hidden rounded-xl bg-cream px-6 text-[15px] font-semibold text-royal transition enabled:hover:brightness-105 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    Submitting…
                    <span className="shimmer-bar absolute inset-x-0 bottom-0 h-0.5" />
                  </>
                ) : (
                  <>
                    Book a consultation
                    <span className="ml-1.5 inline-block transition-transform duration-200 group-enabled:group-hover:translate-x-1">
                      →
                    </span>
                  </>
                )}
              </button>

              {serverError && (
                <p className="mt-3 text-center text-xs text-[#fdba74]">
                  {serverError}
                </p>
              )}

              <p className="mt-4 text-pretty text-center text-[11px] font-medium leading-relaxed text-cream/60">
                Nothing is shared publicly. GDPR compliant. You&rsquo;ll only
                hear from a real person.
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
