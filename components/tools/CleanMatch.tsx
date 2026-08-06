'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/States';
import { Note, PlaceholderTag } from '@/components/ui/Primitives';
import { addOns, cleaningLevels, frequencies, type CleaningLevel, type Frequency } from '@/lib/pricing';
import { cn, currency, formatDuration } from '@/lib/utils';

type Answer = {
  id: string;
  label: string;
  hint?: string;
  service?: Partial<Record<CleaningLevel, number>>;
  frequency?: Partial<Record<Frequency, number>>;
  mode?: string;
  addOns?: string[];
  minutes?: number;
};

type Question = {
  id: string;
  prompt: string;
  help?: string;
  answers: Answer[];
};

const questions: Question[] = [
  {
    id: 'home-type',
    prompt: 'What kind of home are we caring for?',
    answers: [
      { id: 'apartment', label: 'Apartment or condo', service: { standard: 2, recurring: 1 }, minutes: 100 },
      { id: 'house', label: 'House or townhouse', service: { recurring: 2, deep: 1 }, minutes: 150 },
      { id: 'rental', label: 'Short-term rental', service: { turnover: 4 }, frequency: { 'one-time': 1 }, minutes: 130 },
      { id: 'empty', label: 'An empty property', service: { move: 4 }, frequency: { 'one-time': 3 }, minutes: 250 },
    ],
  },
  {
    id: 'frequency',
    prompt: 'How often would you like us to come?',
    answers: [
      { id: 'weekly', label: 'Every week', frequency: { weekly: 4 }, service: { recurring: 2 } },
      { id: 'biweekly', label: 'Every two weeks', frequency: { biweekly: 4 }, service: { recurring: 2 } },
      { id: 'monthly', label: 'Every four weeks', frequency: { monthly: 4 }, service: { recurring: 1, standard: 1 } },
      { id: 'once', label: 'Just once for now', frequency: { 'one-time': 4 }, service: { deep: 1 } },
    ],
  },
  {
    id: 'challenge',
    prompt: 'What is the hardest part to keep up with?',
    answers: [
      { id: 'kitchen', label: 'The kitchen', service: { deep: 1 }, addOns: ['oven'], minutes: 20 },
      { id: 'bathrooms', label: 'Bathrooms', service: { deep: 2 }, minutes: 20 },
      { id: 'floors', label: 'Floors and dust', service: { standard: 2 }, addOns: ['baseboards'] },
      { id: 'clutter', label: 'Things not having a place', addOns: ['organization'], minutes: 40 },
    ],
  },
  {
    id: 'pets',
    prompt: 'Are there pets in the home?',
    answers: [
      { id: 'none', label: 'No pets' },
      { id: 'one', label: 'One pet', mode: 'Pet-Friendly Clean', addOns: ['pet-hair'], minutes: 20 },
      { id: 'multiple', label: 'More than one', mode: 'Pet-Friendly Clean', addOns: ['pet-hair'], service: { deep: 1 }, minutes: 35 },
      { id: 'occasional', label: 'Sometimes — visiting pets', mode: 'Pet-Friendly Clean' },
    ],
  },
  {
    id: 'children',
    prompt: 'Are children part of the household?',
    answers: [
      { id: 'no', label: 'No' },
      { id: 'young', label: 'Yes, young children', service: { deep: 1 }, mode: 'Fragrance-Free Clean', minutes: 15 },
      { id: 'older', label: 'Yes, older children', service: { recurring: 1 } },
      { id: 'visiting', label: 'They visit regularly', service: { standard: 1 } },
    ],
  },
  {
    id: 'products',
    prompt: 'Do you have product preferences?',
    help: 'We follow your preferences exactly. We do not assess sensitivities or make health claims.',
    answers: [
      { id: 'standard', label: 'Standard professional products are fine' },
      { id: 'eco', label: 'Prefer eco-conscious products' },
      { id: 'fragrance-free', label: 'Fragrance-free, please', mode: 'Fragrance-Free Clean' },
      { id: 'mine', label: 'I will provide the products' },
    ],
  },
  {
    id: 'noise',
    prompt: 'How sensitive is the home to noise during a visit?',
    answers: [
      { id: 'not', label: 'Not sensitive — clean normally' },
      { id: 'some', label: 'Some quiet hours matter', mode: 'Quiet Clean' },
      { id: 'very', label: 'Very — calls and naps happen', mode: 'Quiet Clean' },
      { id: 'empty', label: 'Nobody is usually home' },
    ],
  },
  {
    id: 'communication',
    prompt: 'How would you like us to communicate?',
    answers: [
      { id: 'text', label: 'Text messages only', mode: 'Quiet Clean' },
      { id: 'email', label: 'Email is best' },
      { id: 'app', label: 'In the dashboard' },
      { id: 'call', label: 'A call is fine' },
    ],
  },
  {
    id: 'flexibility',
    prompt: 'How flexible is your schedule?',
    answers: [
      { id: 'very', label: 'Very — most days work', frequency: { weekly: 1, biweekly: 1 } },
      { id: 'some', label: 'Some days work', frequency: { biweekly: 1 } },
      { id: 'strict', label: 'One specific window only', frequency: { monthly: 1 } },
      { id: 'urgent', label: 'I need something soon', frequency: { 'one-time': 2 } },
    ],
  },
  {
    id: 'priority',
    prompt: 'Which rooms matter most?',
    answers: [
      { id: 'kitchen-bath', label: 'Kitchen and bathrooms', service: { deep: 1 } },
      { id: 'living', label: 'Living and entry areas', service: { standard: 1 } },
      { id: 'bedrooms', label: 'Bedrooms', addOns: ['linens'] },
      { id: 'everything', label: 'The whole home evenly', service: { recurring: 1 }, minutes: 25 },
    ],
  },
  {
    id: 'detail',
    prompt: 'What level of detail are you after?',
    answers: [
      { id: 'maintain', label: 'Keep it steady', service: { standard: 3, recurring: 2 } },
      { id: 'reset', label: 'A full reset first, then maintain', service: { deep: 4 }, minutes: 60 },
      { id: 'detail', label: 'Detail work every time', service: { deep: 2 }, addOns: ['baseboards', 'fixtures'], minutes: 45 },
      { id: 'presentable', label: 'Presentable for guests', service: { standard: 2 }, mode: 'Guest Ready' },
    ],
  },
  {
    id: 'same-cleaner',
    prompt: 'Would you prefer the same cleaner each visit?',
    help: 'We record this as a preference and aim for it. We do not promise it absolutely, because schedules and time off are real.',
    answers: [
      { id: 'yes', label: 'Yes, consistency matters', service: { recurring: 2 } },
      { id: 'prefer', label: 'Preferred, not essential', service: { recurring: 1 } },
      { id: 'no', label: 'No preference' },
      { id: 'team', label: 'I would rather have a faster team', minutes: -20 },
    ],
  },
];

export function CleanMatch() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const reduce = useReducedMotion();

  const question = questions[index];
  const chosen = answers[question.id];

  const result = useMemo(() => {
    const serviceScores: Record<string, number> = {};
    const frequencyScores: Record<string, number> = {};
    const modes: string[] = [];
    const suggestedAddOns: string[] = [];
    let minutes = 110;

    for (const q of questions) {
      const answerId = answers[q.id];
      if (!answerId) continue;
      const answer = q.answers.find((a) => a.id === answerId);
      if (!answer) continue;

      for (const [key, weight] of Object.entries(answer.service ?? {})) {
        serviceScores[key] = (serviceScores[key] ?? 0) + (weight ?? 0);
      }
      for (const [key, weight] of Object.entries(answer.frequency ?? {})) {
        frequencyScores[key] = (frequencyScores[key] ?? 0) + (weight ?? 0);
      }
      if (answer.mode && !modes.includes(answer.mode)) modes.push(answer.mode);
      for (const addOn of answer.addOns ?? []) {
        if (!suggestedAddOns.includes(addOn)) suggestedAddOns.push(addOn);
      }
      minutes += answer.minutes ?? 0;
    }

    const topService = (Object.entries(serviceScores).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      'standard') as CleaningLevel;
    const topFrequency = (Object.entries(frequencyScores).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      'biweekly') as Frequency;

    return {
      service: cleaningLevels.find((level) => level.id === topService)!,
      frequency: frequencies.find((frequency) => frequency.id === topFrequency)!,
      mode: modes[0] ?? 'Everyday Reset',
      secondaryModes: modes.slice(1),
      addOns: addOns.filter((addOn) => suggestedAddOns.includes(addOn.id)),
      minutes: Math.max(75, minutes),
    };
  }, [answers]);

  const answeredCount = Object.keys(answers).length;

  const choose = (answerId: string) => {
    setAnswers((current) => ({ ...current, [question.id]: answerId }));
    if (index < questions.length - 1) {
      setTimeout(() => setIndex((current) => current + 1), 240);
    } else {
      setTimeout(() => setDone(true), 260);
    }
  };

  if (done) {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[2rem] border border-line bg-white p-6 shadow-lift sm:p-10"
      >
        <p className="eyebrow">Your CleanMatch result</p>
        <h2 className="mt-3 text-3xl sm:text-4xl">{result.service.label}</h2>
        <p className="lede mt-3 max-w-2xl">{result.service.blurb}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <ResultCard title="Recommended frequency" value={result.frequency.label} icon="calendar">
            {result.frequency.note}
          </ResultCard>
          <ResultCard title="Suggested cleaning mode" value={result.mode} icon="sparkle">
            {result.secondaryModes.length
              ? `Also worth considering: ${result.secondaryModes.join(', ')}.`
              : 'You can change the mode on any individual visit.'}
          </ResultCard>
          <ResultCard
            title="Estimated visit duration"
            value={formatDuration(result.minutes)}
            icon="clock"
          >
            Time on site for a typical visit at this scope.
          </ResultCard>
          <ResultCard
            title="Useful add-ons"
            value={result.addOns.length ? `${result.addOns.length} suggested` : 'None needed'}
            icon="plus"
          >
            {result.addOns.length
              ? result.addOns.map((addOn) => `${addOn.label} (${currency(addOn.price)})`).join(' · ')
              : 'Nothing extra is needed for what you described.'}
          </ResultCard>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href="/booking" size="lg">
            Continue to booking
          </Button>
          <Button href={result.service.href} variant="secondary" size="lg">
            Read about this service
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setAnswers({});
              setIndex(0);
              setDone(false);
            }}
          >
            Start over
          </Button>
        </div>

        <Note className="mt-8" title="What this quiz is">
          CleanMatch is a scheduling and service-fit tool. It does not diagnose
          allergies, sensitivities or any health condition, and it does not replace
          advice from a medical professional.
        </Note>
      </motion.div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProgressBar
          value={index + 1}
          total={questions.length}
          label="CleanMatch"
          className="max-w-md"
        />
        <PlaceholderTag>{answeredCount} of {questions.length} answered</PlaceholderTag>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={reduce ? false : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -16 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8"
        >
          <fieldset>
            <legend className="font-display text-2xl leading-snug text-ink sm:text-3xl">
              {question.prompt}
            </legend>
            {question.help ? (
              <p className="mt-3 max-w-2xl text-sm text-muted">{question.help}</p>
            ) : null}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {question.answers.map((answer) => {
                const active = chosen === answer.id;
                return (
                  <label
                    key={answer.id}
                    className={cn(
                      'cursor-pointer rounded-2xl border p-5 transition-all duration-300 ease-luma hover:-translate-y-[1px] hover:shadow-soft',
                      active
                        ? 'border-accent bg-mint/30 shadow-soft'
                        : 'border-line bg-white hover:border-sage',
                    )}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      className="sr-only"
                      checked={active}
                      onChange={() => choose(answer.id)}
                    />
                    <span className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border',
                          active ? 'border-accent bg-accent' : 'border-line',
                        )}
                        aria-hidden="true"
                      >
                        {active ? (
                          <svg width="10" height="8" viewBox="0 0 10 8">
                            <path
                              d="M1 4.2 3.4 6.6 9 1"
                              fill="none"
                              stroke="#fff"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : null}
                      </span>
                      <span>
                        <span className="block text-[16px] font-medium text-ink">
                          {answer.label}
                        </span>
                        {answer.hint ? (
                          <span className="mt-1 block text-sm text-muted">{answer.hint}</span>
                        ) : null}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
        <Button
          variant="ghost"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0}
        >
          Back
        </Button>
        <p className="text-sm text-muted">
          Question {index + 1} of {questions.length}
        </p>
        {index < questions.length - 1 ? (
          <Button onClick={() => setIndex((current) => current + 1)} disabled={!chosen}>
            Next
          </Button>
        ) : (
          <Button onClick={() => setDone(true)} disabled={!chosen}>
            See my match
          </Button>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  title,
  value,
  icon,
  children,
}: {
  title: string;
  value: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-pearl/40 p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-accent">
        <Icon name={icon} size={18} />
      </span>
      <p className="mt-4 text-sm text-muted">{title}</p>
      <p className="font-display text-xl text-ink">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}
