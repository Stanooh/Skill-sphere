import type {
  RoadmapGenerationInput,
  LearningRoadmap,
  RoadmapPhase,
  AIRoadmapMilestone,
} from '@/types';

const STORAGE_KEY = 'skillsphere_ai_roadmap';

interface StoredRoadmap {
  roadmap: LearningRoadmap | null;
}

function loadRoadmap(): LearningRoadmap | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return (JSON.parse(raw) as StoredRoadmap).roadmap;
  } catch {
    // fall through
  }
  return null;
}

function saveRoadmap(roadmap: LearningRoadmap | null): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ roadmap }));
  } catch {
    // ignore
  }
}

export function getAIRoadmap(): LearningRoadmap | null {
  return loadRoadmap();
}

export function updateAIRoadmap(roadmap: LearningRoadmap): void {
  saveRoadmap(roadmap);
}

interface CareerPathTemplate {
  phases: { title: string; description: string; skill: string; topics: string[]; project: string }[];
}

const careerTemplates: Record<string, CareerPathTemplate> = {
  'Frontend Developer': {
    phases: [
      { title: 'Advanced JavaScript', description: 'Master modern JavaScript patterns', skill: 'JavaScript', topics: ['Async/await', 'Modules', 'Error handling', 'Closures & scope'], project: 'API-powered dashboard' },
      { title: 'TypeScript', description: 'Add type safety to your codebase', skill: 'TypeScript', topics: ['Types & interfaces', 'Generics', 'Type-safe React', 'Utility types'], project: 'TypeScript React application' },
      { title: 'Advanced React', description: 'Build production-grade React apps', skill: 'React', topics: ['State management', 'Performance optimization', 'Custom hooks', 'Testing'], project: 'Production-style React application' },
      { title: 'Next.js', description: 'Learn SSR and full-stack React', skill: 'Next.js', topics: ['App Router', 'Server components', 'Data fetching', 'Authentication'], project: 'Full-stack Next.js application' },
      { title: 'Frontend Performance & Testing', description: 'Optimize and test your apps', skill: 'Testing', topics: ['Lighthouse auditing', 'Bundle optimization', 'Jest & RTL', 'E2E testing'], project: 'Performance-optimized web app' },
    ],
  },
  'Backend Developer': {
    phases: [
      { title: 'Node.js Fundamentals', description: 'Server-side JavaScript', skill: 'Node.js', topics: ['Event loop', 'Modules', 'File system', 'Streams'], project: 'REST API server' },
      { title: 'Express & API Design', description: 'Build RESTful APIs', skill: 'Express', topics: ['Routing', 'Middleware', 'Error handling', 'API design patterns'], project: 'CRUD API with validation' },
      { title: 'Databases & SQL', description: 'Data persistence', skill: 'Databases', topics: ['PostgreSQL', 'Schema design', 'Queries', 'Migrations'], project: 'Database-backed application' },
      { title: 'Authentication & Security', description: 'Secure your applications', skill: 'Authentication', topics: ['JWT', 'Sessions', 'Password hashing', 'OAuth'], project: 'Auth system with roles' },
      { title: 'Deployment & DevOps', description: 'Ship to production', skill: 'Deployment', topics: ['Docker', 'CI/CD', 'Cloud hosting', 'Monitoring'], project: 'Deployed backend service' },
    ],
  },
  'Full-Stack Developer': {
    phases: [
      { title: 'TypeScript', description: 'Type safety across the stack', skill: 'TypeScript', topics: ['Types & interfaces', 'Generics', 'Type-safe APIs', 'Shared types'], project: 'Type-safe full-stack app' },
      { title: 'Next.js & API Routes', description: 'Full-stack React framework', skill: 'Next.js', topics: ['App Router', 'API routes', 'Server components', 'Data fetching'], project: 'Next.js full-stack app' },
      { title: 'Database Design', description: 'PostgreSQL and data modeling', skill: 'Databases', topics: ['PostgreSQL', 'Schema design', 'ORMs', 'Migrations'], project: 'Database-driven application' },
      { title: 'Authentication', description: 'User auth and security', skill: 'Authentication', topics: ['JWT', 'Sessions', 'OAuth', 'Row-level security'], project: 'Auth-enabled full-stack app' },
      { title: 'Deployment & Testing', description: 'Ship and test with confidence', skill: 'Deployment', topics: ['Docker', 'CI/CD', 'E2E testing', 'Cloud deployment'], project: 'Production full-stack application' },
    ],
  },
  'UI/UX Designer': {
    phases: [
      { title: 'Design Fundamentals', description: 'Core design principles', skill: 'UI/UX Design', topics: ['Color theory', 'Typography', 'Layout', 'Visual hierarchy'], project: 'Design system documentation' },
      { title: 'Figma Mastery', description: 'Industry-standard design tool', skill: 'Figma', topics: ['Components', 'Auto-layout', 'Prototyping', 'Design tokens'], project: 'Interactive Figma prototype' },
      { title: 'Design Systems', description: 'Scalable, consistent design', skill: 'Tailwind CSS', topics: ['Component libraries', 'Design tokens', 'Accessibility', 'Documentation'], project: 'Reusable component library' },
      { title: 'Frontend for Designers', description: 'Bring designs to life', skill: 'React', topics: ['JSX basics', 'Component structure', 'Styling in React', 'Responsive design'], project: 'Designed and built landing page' },
      { title: 'Portfolio & Case Studies', description: 'Showcase your work', skill: 'UI/UX Design', topics: ['Case study writing', 'Portfolio design', 'Design presentation', 'Interview prep'], project: 'Complete design portfolio' },
    ],
  },
  'Data Analyst': {
    phases: [
      { title: 'Python for Data', description: 'Data manipulation with Python', skill: 'Python', topics: ['Pandas', 'NumPy', 'Data cleaning', 'Jupyter'], project: 'Data cleaning pipeline' },
      { title: 'SQL & Databases', description: 'Query and analyze data', skill: 'SQL', topics: ['Joins', 'Aggregations', 'Window functions', 'Query optimization'], project: 'SQL analysis dashboard' },
      { title: 'Data Visualization', description: 'Communicate insights visually', skill: 'Python', topics: ['Matplotlib', 'Seaborn', 'Plotly', 'Dashboard design'], project: 'Interactive data dashboard' },
      { title: 'Statistics & Analysis', description: 'Statistical foundations', skill: 'Python', topics: ['Descriptive stats', 'Hypothesis testing', 'Regression', 'A/B testing'], project: 'Statistical analysis report' },
      { title: 'Business Intelligence', description: 'Real-world analytics', skill: 'SQL', topics: ['ETL pipelines', 'BI tools', 'Reporting', 'Stakeholder communication'], project: 'End-to-end BI dashboard' },
    ],
  },
  'Data Scientist': {
    phases: [
      { title: 'Python & Statistics', description: 'Programming and math foundation', skill: 'Python', topics: ['Pandas', 'Statistics', 'Probability', 'Hypothesis testing'], project: 'Statistical analysis notebook' },
      { title: 'Machine Learning', description: 'Core ML algorithms', skill: 'Python', topics: ['Scikit-learn', 'Classification', 'Regression', 'Clustering'], project: 'ML model with evaluation' },
      { title: 'Deep Learning', description: 'Neural networks', skill: 'Python', topics: ['TensorFlow/PyTorch', 'Neural networks', 'CNNs', 'RNNs'], project: 'Image classification model' },
      { title: 'Data Engineering', description: 'Build data pipelines', skill: 'SQL', topics: ['ETL', 'Data warehouses', 'Spark', 'Big data'], project: 'Data pipeline' },
      { title: 'ML Deployment', description: 'Ship models to production', skill: 'Python', topics: ['Model serving', 'APIs', 'Monitoring', 'MLOps'], project: 'Deployed ML service' },
    ],
  },
  'Mobile Developer': {
    phases: [
      { title: 'React Native Basics', description: 'Cross-platform mobile development', skill: 'React Native', topics: ['Components', 'Navigation', 'Styling', 'Platform APIs'], project: 'Mobile app prototype' },
      { title: 'State Management', description: 'Manage app state', skill: 'React', topics: ['Redux', 'Context', 'Async storage', 'Offline support'], project: 'State-managed mobile app' },
      { title: 'APIs & Backend', description: 'Connect to services', skill: 'Node.js', topics: ['REST APIs', 'Authentication', 'Push notifications', 'Real-time data'], project: 'API-connected mobile app' },
      { title: 'Mobile UI/UX', description: 'Native-feeling interfaces', skill: 'UI/UX Design', topics: ['Mobile patterns', 'Gestures', 'Animations', 'Accessibility'], project: 'Polished mobile UI' },
      { title: 'Deployment', description: 'Publish to app stores', skill: 'Deployment', topics: ['Expo', 'App Store', 'Play Store', 'CI/CD for mobile'], project: 'Published mobile app' },
    ],
  },
  'DevOps Engineer': {
    phases: [
      { title: 'Linux & Scripting', description: 'Command line and automation', skill: 'Deployment', topics: ['Linux fundamentals', 'Bash scripting', 'SSH', 'Process management'], project: 'Automated server setup script' },
      { title: 'Docker & Containers', description: 'Containerize applications', skill: 'Docker', topics: ['Dockerfiles', 'Compose', 'Multi-stage builds', 'Image optimization'], project: 'Containerized application' },
      { title: 'CI/CD Pipelines', description: 'Automated delivery', skill: 'Deployment', topics: ['GitHub Actions', 'Pipeline design', 'Testing in CI', 'Deployment strategies'], project: 'CI/CD pipeline' },
      { title: 'Cloud Infrastructure', description: 'Cloud platforms and IaC', skill: 'Deployment', topics: ['AWS/GCP', 'Terraform', 'Networking', 'Load balancing'], project: 'Infrastructure as code project' },
      { title: 'Monitoring & Observability', description: 'Keep systems healthy', skill: 'Docker', topics: ['Logging', 'Metrics', 'Alerting', 'Incident response'], project: 'Monitoring stack' },
    ],
  },
  'Cybersecurity Specialist': {
    phases: [
      { title: 'Security Fundamentals', description: 'Core security concepts', skill: 'Python', topics: ['Network security', 'Cryptography basics', 'Threat models', 'OWASP Top 10'], project: 'Security audit checklist' },
      { title: 'Network Security', description: 'Protect network infrastructure', skill: 'Python', topics: ['Firewalls', 'IDS/IPS', 'Network scanning', 'VPN'], project: 'Network security assessment' },
      { title: 'Penetration Testing', description: 'Find vulnerabilities', skill: 'Python', topics: ['Reconnaissance', 'Exploitation', 'Reporting', 'Metasploit'], project: 'Pen test report' },
      { title: 'Application Security', description: 'Secure applications', skill: 'Node.js', topics: ['Secure coding', 'Input validation', 'Auth patterns', 'API security'], project: 'Secure application' },
      { title: 'Security Operations', description: 'Monitor and respond', skill: 'Python', topics: ['SIEM', 'Incident response', 'Forensics', 'Threat hunting'], project: 'Security monitoring setup' },
    ],
  },
};

export function getCareerPaths(): string[] {
  return Object.keys(careerTemplates);
}

export function generateAIRoadmap(input: RoadmapGenerationInput): LearningRoadmap {
  const template = careerTemplates[input.careerPath] ?? careerTemplates['Frontend Developer'];

  const phases: RoadmapPhase[] = template.phases.map((phase, idx) => {
    const milestones: AIRoadmapMilestone[] = [
      {
        id: `m-${Date.now()}-${idx}`,
        title: phase.title,
        skill: phase.skill,
        description: phase.description,
        status: idx === 0 ? 'available' : 'locked',
        topics: phase.topics,
        project: phase.project,
      },
    ];

    return {
      id: `phase-${Date.now()}-${idx}`,
      title: phase.title,
      description: phase.description,
      milestones,
    };
  });

  // Mark first phase as available, unlock based on existing skills
  let firstUnlocked = false;
  for (const phase of phases) {
    const skillId = phase.milestones[0].skill;
    const learnerLevel = input.skillLevels[skillId];
    if (learnerLevel === 'advanced' || learnerLevel === 'expert') {
      phase.milestones[0].status = 'completed';
    } else if (!firstUnlocked) {
      phase.milestones[0].status = 'available';
      firstUnlocked = true;
    } else {
      phase.milestones[0].status = 'locked';
    }
  }

  const roadmap: LearningRoadmap = {
    id: `ai-roadmap-${Date.now()}`,
    learnerId: input.learnerId,
    careerPath: input.careerPath,
    currentLevel: input.skillLevels[input.currentSkills[0]] ?? 'beginner',
    targetTimeline: input.targetTimeline,
    hoursPerWeek: input.hoursPerWeek,
    phases,
    progress: 0,
    createdAt: new Date().toISOString(),
  };

  saveRoadmap(roadmap);
  return roadmap;
}

export function updateMilestoneStatus(
  roadmapId: string,
  phaseId: string,
  milestoneId: string,
  status: AIRoadmapMilestone['status']
): LearningRoadmap | null {
  const roadmap = loadRoadmap();
  if (!roadmap || roadmap.id !== roadmapId) return null;

  const phase = roadmap.phases.find((p) => p.id === phaseId);
  if (!phase) return null;
  const milestone = phase.milestones.find((m) => m.id === milestoneId);
  if (!milestone) return null;

  milestone.status = status;

  // If completed, unlock next milestone
  if (status === 'completed') {
    const allMilestones = roadmap.phases.flatMap((p) => p.milestones);
    const currentIdx = allMilestones.findIndex((m) => m.id === milestoneId);
    if (currentIdx >= 0 && currentIdx < allMilestones.length - 1) {
      const next = allMilestones[currentIdx + 1];
      if (next.status === 'locked') {
        next.status = 'available';
      }
    }
  }

  // Recalculate progress
  const allMilestones = roadmap.phases.flatMap((p) => p.milestones);
  const completed = allMilestones.filter((m) => m.status === 'completed').length;
  roadmap.progress = allMilestones.length > 0 ? Math.round((completed / allMilestones.length) * 100) : 0;

  saveRoadmap(roadmap);
  return roadmap;
}

export function toggleMilestoneComplete(
  roadmapId: string,
  phaseId: string,
  milestoneId: string
): LearningRoadmap | null {
  const roadmap = loadRoadmap();
  if (!roadmap) return null;

  const phase = roadmap.phases.find((p) => p.id === phaseId);
  const milestone = phase?.milestones.find((m) => m.id === milestoneId);
  if (!milestone) return null;

  const newStatus = milestone.status === 'completed' ? 'available' : 'completed';
  return updateMilestoneStatus(roadmapId, phaseId, milestoneId, newStatus);
}

export function getRoadmapProgress(roadmap: LearningRoadmap): number {
  const allMilestones = roadmap.phases.flatMap((p) => p.milestones);
  const completed = allMilestones.filter((m) => m.status === 'completed').length;
  return allMilestones.length > 0 ? Math.round((completed / allMilestones.length) * 100) : 0;
}
