/**
 * Strip compose-overriding env vars to prevent cross-project contamination.
 *
 * COMPOSE_PROJECT_NAME — if set in the user's shell, docker compose would target
 *   a completely different project instead of the one specified via -f.
 * COMPOSE_FILE — would override which compose file is used, ignoring our -f flag.
 * COMPOSE_PROFILES — could activate unintended service profiles.
 * DOCKER_CONTEXT — would switch the docker daemon being targeted.
 */
export function buildSafeEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  delete env.COMPOSE_PROJECT_NAME
  delete env.COMPOSE_FILE
  delete env.COMPOSE_PROFILES
  delete env.COMPOSE_ENV_FILES
  delete env.DOCKER_CONTEXT
  env.FORCE_COLOR = '0'
  env.TERM = 'dumb'
  return env
}
