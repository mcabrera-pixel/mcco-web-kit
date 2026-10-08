#!/usr/bin/env node
// mcco-sitio: lo usan los workflows del kit. Entrega el proyecto Cloudflare y el dominio desde site.yaml
// (project= y domain= en $GITHUB_OUTPUT). Si el workflow del sitio pasa un proyecto distinto (PROYECTO_INPUT), falla.
import fs from 'node:fs';
import { loadSite } from '../lib/site.mjs';

const site = loadSite();
const proyecto = site.cloudflare.project;
const pedido = (process.env.PROYECTO_INPUT ?? '').trim();
if (pedido && pedido !== proyecto) {
  console.error(`mcco-sitio: el workflow pide el proyecto "${pedido}" pero site.yaml dice "${proyecto}". Quita "with: project" del workflow del sitio: el proyecto sale de site.yaml.`);
  process.exit(1);
}
const salida = `project=${proyecto}\ndomain=${site.domain}\n`;
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, salida);
process.stdout.write(salida);
