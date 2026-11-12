import type { CareerAdvisorMessage, LearnerContext } from '@/types';

const STORAGE_KEY = 'skillsphere_advisor_chat';

interface StoredConversation {
  messages: CareerAdvisorMessage[];
}

const EMPTY_CONVERSATION: CareerAdvisorMessage[] = [];
const conversationListeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedMessages = EMPTY_CONVERSATION;

function loadConversation(): CareerAdvisorMessage[] {
  return getConversationSnapshot();
}

function saveConversation(messages: CareerAdvisorMessage[]): void {
  try {
    const raw = JSON.stringify({ messages });
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedMessages = messages;
    conversationListeners.forEach((listener) => listener());
  } catch {
    // ignore
  }
}

export function getConversation(): CareerAdvisorMessage[] {
  return loadConversation();
}

export function subscribeToConversation(onChange: () => void): () => void {
  conversationListeners.add(onChange);
  if (typeof window !== 'undefined') {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        cachedRaw = undefined;
        onChange();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      conversationListeners.delete(onChange);
      window.removeEventListener('storage', handleStorage);
    };
  }
  return () => {
    conversationListeners.delete(onChange);
  };
}

export function getConversationSnapshot(): CareerAdvisorMessage[] {
  if (typeof window === 'undefined') return EMPTY_CONVERSATION;
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_CONVERSATION;
  }
  if (raw === cachedRaw) return cachedMessages;

  cachedRaw = raw;
  if (!raw) {
    cachedMessages = EMPTY_CONVERSATION;
    return cachedMessages;
  }

  try {
    cachedMessages = (JSON.parse(raw) as StoredConversation).messages;
    return cachedMessages;
  } catch {
    cachedMessages = EMPTY_CONVERSATION;
    return cachedMessages;
  }
}

export function getServerConversationSnapshot(): CareerAdvisorMessage[] {
  return EMPTY_CONVERSATION;
}

export function clearConversation(): void {
  saveConversation([]);
}

export function getWelcomeMessage(name: string): CareerAdvisorMessage {
  const firstName = name.split(' ')[0];
  return {
    id: `msg-welcome-${Date.now()}`,
    role: 'assistant',
    content: `Hi ${firstName}. I'm your AI Career Advisor. Based on your SkillSphere profile, I can give you personalized guidance on career paths, skills to learn next, and projects to build. Ask me anything about your career or learning direction.`,
    createdAt: new Date().toISOString(),
  };
}

interface KeywordGroup {
  keywords: string[];
  handler: (ctx: LearnerContext) => string;
}

function skillNames(ctx: LearnerContext): string {
  return ctx.skills.map((s) => s.name).join(', ') || 'no skills listed yet';
}

function topSkill(ctx: LearnerContext): string {
  return ctx.skills[0]?.name ?? 'your current skills';
}

const responseGroups: KeywordGroup[] = [
  {
    keywords: ['next', 'learn next', 'should i learn', 'what should i learn', 'after'],
    handler: (ctx) => {
      const skills = ctx.skills.map((s) => s.name);
      const hasReact = skills.includes('React');
      const hasJS = skills.includes('JavaScript');
      const hasTS = skills.includes('TypeScript');

      if (hasReact && !hasTS) {
        return `Based on your current React and JavaScript skills, I recommend learning TypeScript next. TypeScript is essential for modern frontend development and will make your React code more robust and maintainable. After TypeScript, you could move on to Next.js to expand into full-stack territory. Since your goal is "${ctx.learningGoal}", this progression aligns well with industry expectations.`;
      }
      if (hasJS && !hasReact) {
        return `With your JavaScript foundation, the logical next step is React. React is the most in-demand frontend framework and will let you build interactive applications. After React, TypeScript and Next.js would round out your frontend skill set nicely for your goal of "${ctx.learningGoal}".`;
      }
      if (hasReact && hasTS) {
        return `You already have React and TypeScript — great foundation. Next I'd recommend focusing on Next.js for server-side rendering and routing, then exploring backend fundamentals like Node.js and databases to move toward your goal of "${ctx.learningGoal}".`;
      }
      return `Given your current skills (${skillNames(ctx)}), I'd recommend building a strong foundation first. Start with HTML and CSS if you haven't, then move to JavaScript. From there, React and TypeScript are the natural next steps toward your goal of "${ctx.learningGoal}".`;
    },
  },
  {
    keywords: ['career path', 'career', 'paths', 'direction', 'options'],
    handler: (ctx) => {
      const skills = ctx.skills.map((s) => s.name);
      const hasFrontend = skills.some((s) => ['React', 'JavaScript', 'CSS', 'HTML', 'Tailwind CSS'].includes(s));
      const hasBackend = skills.some((s) => ['Node.js', 'Python', 'SQL', 'PostgreSQL'].includes(s));
      const hasDesign = skills.some((s) => ['UI/UX Design', 'Figma'].includes(s));

      const paths: string[] = [];
      if (hasFrontend) paths.push('Frontend Developer');
      if (hasBackend) paths.push('Backend Developer');
      if (hasFrontend && hasBackend) paths.push('Full-Stack Developer');
      if (hasDesign) paths.push('UI/UX Designer');
      if (skills.includes('Python')) paths.push('Data Analyst');
      if (paths.length === 0) paths.push('Frontend Developer', 'Backend Developer');

      return `Based on your current skills (${skillNames(ctx)}), here are career paths that fit your profile:\n\n${paths.map((p) => `• ${p}`).join('\n')}\n\nYour stated goal is "${ctx.learningGoal}". I'd recommend focusing on the path that aligns most closely with that goal. You can generate a personalized learning roadmap for any of these paths to get a step-by-step plan.`;
    },
  },
  {
    keywords: ['project', 'projects', 'build', 'portfolio'],
    handler: (ctx) => {
      const skills = ctx.skills.map((s) => s.name);
      const hasReact = skills.includes('React');
      const hasJS = skills.includes('JavaScript');

      if (hasReact) {
        return `Great question. Here are project ideas that match your skills and goal of "${ctx.learningGoal}":\n\n• A task management app with drag-and-drop (React, state management)\n• A weather dashboard consuming a public API (React, fetch, hooks)\n• A portfolio website built with Next.js (showcase your work)\n• A real-time chat application (React, WebSocket basics)\n\nThese projects will demonstrate your ability to build production-style applications and fill gaps in your portfolio.`;
      }
      if (hasJS) {
        return `Here are projects suited to your current skills:\n\n• A calculator app (JavaScript DOM)\n• A to-do list with localStorage (JavaScript, state)\n• A simple API consumer (fetch, async/await)\n\nOnce you learn React, you can rebuild these as component-based apps, which will show clear growth in your portfolio.`;
      }
      return `Start with small projects that match your current level. A personal website, a landing page, or a simple interactive widget are all great first projects. As you learn more skills, you can build increasingly complex applications aligned with your goal of "${ctx.learningGoal}".`;
    },
  },
  {
    keywords: ['fullstack', 'full-stack', 'full stack'],
    handler: (ctx) => {
      return `To become a full-stack developer from your current position (${skillNames(ctx)}), you'll need to add backend skills. Your frontend knowledge (${topSkill(ctx)}) is a strong start. I'd recommend learning:\n\n• Node.js and Express for backend APIs\n• PostgreSQL for database management\n• Authentication patterns (JWT, sessions)\n• Deployment (Docker, cloud platforms)\n\nThis will let you build complete applications end-to-end. You can generate a full-stack developer roadmap to get a structured plan with milestones.`;
    },
  },
  {
    keywords: ['frontend', 'front-end', 'front end'],
    handler: (ctx) => {
      return `For a frontend development career, your current skills (${skillNames(ctx)}) are a good starting point. The key skills employers look for:\n\n• React (you ${ctx.skills.some((s) => s.name === 'React') ? 'have this' : 'should learn this next'})\n• TypeScript for type-safe code\n• CSS frameworks like Tailwind\n• Testing (Jest, React Testing Library)\n• Performance optimization\n• Next.js for modern SSR applications\n\nYour goal of "${ctx.learningGoal}" aligns well with this path. Consider generating a Frontend Developer roadmap for a detailed plan.`;
    },
  },
  {
    keywords: ['backend', 'back-end', 'back end'],
    handler: (ctx) => {
      return `Backend development is a strong career path. From your current skills (${skillNames(ctx)}), I'd recommend:\n\n• Node.js or Python for server-side programming\n• REST API design and GraphQL\n• Databases (PostgreSQL, SQL fundamentals)\n• Authentication and security\n• Docker and deployment\n\nBackend roles are in high demand and pair well with your goal of "${ctx.learningGoal}". You can generate a Backend Developer roadmap to get a structured learning plan.`;
    },
  },
  {
    keywords: ['typescript', 'ts'],
    handler: (ctx) => {
      const hasReact = ctx.skills.some((s) => s.name === 'React');
      if (hasReact) {
        return `Yes, TypeScript is highly recommended given your React skills. It provides type safety, better IDE support, and catches errors at compile time. Most production React codebases use TypeScript. Start with basic types, interfaces, and generics, then apply them to your React components. This will directly strengthen your path toward "${ctx.learningGoal}".`;
      }
      return `TypeScript is a valuable skill for any JavaScript developer. It adds type safety and makes code more maintainable. Start by learning basic types, interfaces, and generics, then apply TypeScript to your projects. It's especially important if you're working toward "${ctx.learningGoal}".`;
    },
  },
  {
    keywords: ['roadmap', 'plan', 'learning plan'],
    handler: (ctx) => {
      return `I can help with that. Based on your current skills (${skillNames(ctx)}) and your goal of "${ctx.learningGoal}", I'd recommend generating a personalized learning roadmap. The roadmap generator will create a structured plan with phases, milestones, and projects tailored to your career path and available time. You can generate your roadmap from the Roadmap page.`;
    },
  },
  {
    keywords: ['mentor', 'mentors', 'help', 'guidance'],
    handler: (ctx) => {
      return `SkillSphere can recommend mentors whose expertise matches your skills and goals. Based on your profile (${skillNames(ctx)}) and your goal of "${ctx.learningGoal}", the mentor recommendation engine will surface mentors with relevant expertise. You can browse recommended mentors from the Find Mentors page and request sessions with those who match best.`;
    },
  },
  {
    keywords: ['how', 'prepare', 'employable', 'job', 'career'],
    handler: (ctx) => {
      return `To prepare for a software engineering career with your current skills (${skillNames(ctx)}), I recommend:\n\n1. Deepen your core skills — go beyond tutorials by building real projects\n2. Learn the next skill in your stack (check the roadmap generator for a plan)\n3. Build a portfolio of 3-4 polished projects on GitHub\n4. Practice technical interviews and problem-solving\n5. Connect with mentors on SkillSphere for guidance specific to your path\n\nYour goal of "${ctx.learningGoal}" is achievable. Consistency matters more than speed — even ${ctx.availableHoursPerWeek} hours per week will get you there.`;
    },
  },
];

export function askQuestion(question: string, context: LearnerContext): CareerAdvisorMessage {
  const lowerQ = question.toLowerCase().trim();

  let response = '';
  let includeRoadmapLink = false;

  for (const group of responseGroups) {
    if (group.keywords.some((kw) => lowerQ.includes(kw))) {
      response = group.handler(context);
      if (group.keywords.some((kw) => ['roadmap', 'plan', 'fullstack', 'full-stack', 'career path', 'direction'].includes(kw))) {
        includeRoadmapLink = true;
      }
      break;
    }
  }

  if (!response) {
    // Default contextual response
    response = `That's a good question. Based on your profile — your skills (${skillNames(context)}), your goal of "${context.learningGoal}", and your available time of ${context.availableHoursPerWeek} hours per week — I'd recommend focusing on the next logical step in your learning journey. You can generate a personalized roadmap for a structured plan, or browse recommended mentors for one-on-one guidance.`;
    includeRoadmapLink = true;
  }

  const messages = loadConversation();
  const userMsg: CareerAdvisorMessage = {
    id: `msg-user-${Date.now()}`,
    role: 'user',
    content: question,
    createdAt: new Date().toISOString(),
  };
  const assistantMsg: CareerAdvisorMessage = {
    id: `msg-ai-${Date.now() + 1}`,
    role: 'assistant',
    content: response,
    createdAt: new Date().toISOString(),
    includeRoadmapLink,
  };
  const updated = [...messages, userMsg, assistantMsg];
  saveConversation(updated);

  return assistantMsg;
}

export function addUserMessage(question: string): CareerAdvisorMessage {
  const messages = loadConversation();
  const userMsg: CareerAdvisorMessage = {
    id: `msg-user-${Date.now()}`,
    role: 'user',
    content: question,
    createdAt: new Date().toISOString(),
  };
  const updated = [...messages, userMsg];
  saveConversation(updated);
  return userMsg;
}
