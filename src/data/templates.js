// Template structure is data, not markup — Pagecraft renders any template
// from this schema, keeping content and structure separate per the spec.

export const SECTION_LIBRARY = {
  header: { label: 'Header / Hero', blurb: 'Name, role, introduction, profile identity' },
  about: { label: 'About', blurb: 'Personal or professional summary' },
  skills: { label: 'Skills', blurb: 'Technical or professional skills' },
  'technical-skills': { label: 'Technical Skills', blurb: 'Languages, frameworks, tools' },
  experience: { label: 'Experience', blurb: 'Work experience, internships, roles' },
  education: { label: 'Education', blurb: 'Academic background and qualifications' },
  projects: { label: 'Projects', blurb: 'Projects, descriptions, technologies, links' },
  'projects-work': { label: 'Projects / Work', blurb: 'Selected creative or professional work' },
  process: { label: 'Process', blurb: 'Research, iteration, and design decisions' },
  outcome: { label: 'Outcome', blurb: 'Results, impact, and metrics' },
  gallery: { label: 'Gallery', blurb: 'Full-bleed image showcase' },
  contact: { label: 'Contact', blurb: 'Contact details and relevant links' },
};

export const TEMPLATES = [
  {
    templateId: 'professional-portfolio',
    name: 'Professional Portfolio',
    purpose: 'Clean portfolio for students, developers, designers, and working professionals.',
    accent: 'highlighter-yellow',
    sections: ['header', 'about', 'skills', 'experience', 'projects', 'contact'],
  },
  {
    templateId: 'developer-portfolio',
    name: 'Developer Portfolio',
    purpose: 'Technical portfolio focused on software development and projects.',
    accent: 'signal-blue',
    sections: ['header', 'about', 'technical-skills', 'experience', 'projects', 'contact'],
  },
  {
    templateId: 'student-resume',
    name: 'Student Resume',
    purpose: 'Resume-style page for students and freshers.',
    accent: 'annotation-red',
    sections: ['header', 'about', 'education', 'skills', 'projects', 'experience', 'contact'],
  },
  {
    templateId: 'creative-portfolio',
    name: 'Creative Portfolio',
    purpose: 'Portfolio for designers and users who want to showcase creative work.',
    accent: 'peach-wash',
    sections: ['header', 'about', 'skills', 'projects-work', 'experience', 'contact'],
  },
  {
    templateId: 'ux-case-study',
    name: 'UX Case Study',
    purpose: 'Deep-dive layout for walking through process, research, and outcomes.',
    accent: 'mint-fresh',
    sections: ['header', 'about', 'process', 'outcome', 'projects-work', 'contact'],
  },
  {
    templateId: 'photographer-portfolio',
    name: 'Photographer Portfolio',
    purpose: 'Full-bleed gallery template built for large images and minimal text.',
    accent: 'sand-dune',
    sections: ['header', 'about', 'gallery', 'contact'],
  },
];