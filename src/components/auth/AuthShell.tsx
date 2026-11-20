'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, GraduationCap } from 'lucide-react';
import type { ReactNode } from 'react';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
        inverse ? 'bg-white/15 text-white' : 'bg-[#980868] text-white'
      }`}
    >
      <GraduationCap className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

export function AuthShell({ eyebrow, title, description, footer, children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#101010] px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1400px] flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-4rem)] lg:flex-row lg:rounded-[2.5rem]">
        <section className="relative hidden min-h-[260px] w-full overflow-hidden bg-[#980868] p-8 text-white md:flex md:flex-col md:justify-between lg:min-h-0 lg:w-[48%] lg:p-12 xl:p-16">
          <Image
            src="/images/auth/signup.jfif"
            alt=""
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 48vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#101010]/45" />

          <Link href="/" className="relative z-10 flex w-fit items-center gap-3">
            <BrandMark inverse />
            <span className="text-xl font-bold tracking-tight">SkillSphere</span>
          </Link>

          <div className="relative z-10">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
              Learn. Connect. Grow.
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight xl:text-5xl">
              Turn your ambition into progress.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/70">
              Build meaningful skills with trusted mentors and a community that helps you move forward.
            </p>
          </div>

          <p className="relative z-10 text-sm text-white/55">
            Skill-sharing, mentorship, and personalized learning.
          </p>
        </section>

        <section className="flex min-w-0 flex-1 items-center justify-center overflow-y-auto bg-[#ffffff] px-5 py-8 sm:px-10 lg:px-12 xl:px-20">
          <div className="w-full max-w-[520px]">
            <Link href="/" className="mb-8 flex w-fit items-center gap-3 lg:hidden">
              <BrandMark />
              <span className="text-lg font-bold tracking-tight text-[#101010]">SkillSphere</span>
            </Link>

            <div className="mb-7">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#980868]">
                {eyebrow}
              </p>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-[#101010] sm:text-4xl">{title}</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[#6b7280]">{description}</p>
                </div>
                <ArrowUpRight className="mt-1 hidden h-6 w-6 shrink-0 text-[#980868] sm:block" aria-hidden="true" />
              </div>
            </div>

            {children}
            {footer}
          </div>
        </section>
      </div>
    </main>
  );
}
