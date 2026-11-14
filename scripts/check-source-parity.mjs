#!/usr/bin/env node
import { runVerification } from '../lib/verification.mjs';

const verification = await runVerification();
const parity = verification.sourceParity;
console.log(JSON.stringify(parity, null, 2));
if (!parity.ok) process.exitCode = 1;
