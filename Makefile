.PHONY: install typecheck test lint verify docs-check

install:
	npm install

typecheck:
	npm run typecheck

test:
	npm test

lint:
	npm run lint

verify: typecheck test lint
	@echo "Core checks passed."

docs-check:
	@test -f AGENTS.md
	@test -f memory/CURRENT_STATE.md
	@test -f memory/OPEN_WORK.md
	@test -f docs/MASTER_SPEC.md
	@test -f docs/AUTO_LOGGING.md
	@test -f docs/CODING_AGENT_HANDOFF.md
	@echo "Agent handoff documentation present."
