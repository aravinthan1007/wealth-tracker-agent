'use strict'

/**
 * Dynatrace-for-AI Skill Loader
 * Loads SKILL.md files from backend/skills/dynatrace/
 * and returns combined content for embedding in system prompts.
 */

const fs   = require('fs')
const path = require('path')

const SKILLS_DIR = path.join(__dirname, 'dynatrace')

const SKILL_FILES = {
  'dql-essentials': 'dt-dql-essentials.md',
  'obs-services':   'dt-obs-services.md',
  'obs-logs':       'dt-obs-logs.md',
  'obs-problems':   'dt-obs-problems.md',
  'app-dashboards': 'dt-app-dashboards.md',
}

function loadSkill(name) {
  const file = SKILL_FILES[name]
  if (!file) throw new Error(`Unknown skill: ${name}. Available: ${Object.keys(SKILL_FILES).join(', ')}`)
  const fp = path.join(SKILLS_DIR, file)
  if (!fs.existsSync(fp)) throw new Error(`Skill file not found: ${fp}`)
  return fs.readFileSync(fp, 'utf8')
}

function loadSkills(names) {
  return names.map(name => {
    try {
      return `\n\n---\n## Dynatrace Skill: ${name}\n\n${loadSkill(name)}`
    } catch (e) {
      return `\n\n[Skill ${name} unavailable: ${e.message}]`
    }
  }).join('\n')
}

function loadAllSkills() {
  return loadSkills(Object.keys(SKILL_FILES))
}

function listSkills() {
  return Object.keys(SKILL_FILES).map(name => {
    const fp = path.join(SKILLS_DIR, SKILL_FILES[name])
    return {
      name,
      file: SKILL_FILES[name],
      available: fs.existsSync(fp),
    }
  })
}

module.exports = { loadSkill, loadSkills, loadAllSkills, listSkills }
