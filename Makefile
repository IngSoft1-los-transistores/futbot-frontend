# Las recetas sólo llaman a Node y npm, así funcionan igual en PowerShell (cmd), Git Bash, WSL, Linux y macOS.

.DEFAULT_GOAL := help
.PHONY: help install reinstall dev test test-unit test-e2e coverage lint clean

help: ## Muestra los comandos disponibles
	@node -e "const s = require('fs').readFileSync('Makefile', 'utf8'); for (const m of s.matchAll(/^([a-zA-Z0-9_-]+):.*?## (.*)/gm)) console.log('  make ' + m[1].padEnd(10) + ' ' + m[2])"

install: ## Instala las dependencias y el Chromium que usa Playwright
	npm install
	npx playwright install chromium

reinstall: ## Borra node_modules y reinstala (al cambiar de sistema o si quedó roto)
	node -e "require('fs').rmSync('node_modules', { recursive: true, force: true })"
	npm install
	npx playwright install chromium

dev: ## Levanta la app en http://localhost:5173 con recarga automática
	npm run dev

test: test-unit test-e2e ## Corre los tests unitarios y después los e2e

test-unit: ## Corre los tests unitarios (Vitest) una sola vez
	npm test -- --run

test-e2e: ## Corre los tests e2e (Playwright); requiere el puerto 5173 libre
	npm run test:e2e

coverage: ## Corre los tests unitarios y genera la cobertura en coverage/index.html
	npm test -- --run --coverage
	@echo Reporte: coverage/index.html

lint: ## Revisa el código con ESLint
	npm run lint

clean: ## Borra builds y reportes (no toca .env ni node_modules)
	@node -e "for (const d of ['dist', 'dist-ssr', 'coverage', 'playwright-report', 'test-results']) require('fs').rmSync(d, { recursive: true, force: true })"
