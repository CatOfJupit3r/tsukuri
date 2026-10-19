import type { SkillId } from '#~/enums/skill-ids.enums';

/** Skills live in the repository's `.agents/skills/<id>` folders and are copied to the same place. */
export const SKILLS_DIR = '.agents/skills';

export function skillPath(skillId: SkillId) {
  return `${SKILLS_DIR}/${skillId}`;
}
