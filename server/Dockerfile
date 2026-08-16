# Portable image for the Koa API. Needs a real container (not a serverless
# function) because the judge (src/judge/executor.ts) shells out to `g++` and
# runs the compiled binary against test input on disk — see DEPLOYMENT.md for
# why this rules out Vercel for the backend.
#
# Works unchanged on Render, Railway, Fly.io, or any other Docker host.

FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
# g++ compiles submitted C++; util-linux provides `prlimit`, used to enforce
# the judge's per-run memory limit (optional — falls back to unenforced if
# missing, see hasPrlimit() in judge/executor.ts).
RUN apt-get update \
  && apt-get install -y --no-install-recommends g++ util-linux \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
