import { Course, Phase, Part, PartStatus } from './course-types';

export interface GeneratedLesson {
  lesson_number: number;
  title: string;
  description: string;
  instructional_seed: string;
}

export interface GeneratedPhase {
  phase_number: number;
  title: string;
  description: string;
  lessons: GeneratedLesson[];
}

export interface GeneratedCourseStructure {
  title: string;
  phases: GeneratedPhase[];
}

export function mapGeneratedStructureToCourse(
  structure: GeneratedCourseStructure,
  subject: string
): Course {
  return {
    title: structure.title,
    subject: subject,
    phases: structure.phases.map((phase, phaseIndex) => ({
      id: `phase_${phaseIndex + 1}`,
      title: phase.title,
      description: phase.description,
      parts: phase.lessons.map((lesson, lessonIndex) => ({
        id: `part_${phaseIndex + 1}_${lessonIndex + 1}`,
        title: lesson.title,
        // We use the description and seed as initial content/criteria
        // In a real app, content would be generated on demand or pre-generated
        content: `## ${lesson.title}\n\n${lesson.description}\n\n*Content to be generated based on seed:*\n${lesson.instructional_seed}`, 
        mastery_criteria: lesson.description, // Simplified mapping
        status: (phaseIndex === 0 && lessonIndex === 0) ? 'not_started' : 'locked', // First lesson is ready, others locked
      })),
    })),
  };
}
