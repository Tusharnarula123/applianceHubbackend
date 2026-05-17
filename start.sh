#!/bin/bash
export NODE_OPTIONS="--require /app/polyfill.cjs"
exec npm run start:dev
