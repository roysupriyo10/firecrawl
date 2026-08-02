FROM node:22-slim

WORKDIR /usr/src/app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY pnpm-lock.yaml package.json ./
RUN --mount=type=cache,id=pnpm-playwright,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

ENV PLAYWRIGHT_BROWSERS_PATH=/usr/local/share/playwright

# Install Playwright dependencies
RUN pnpm exec playwright install chromium --with-deps

RUN pnpm run build

ARG PORT
ENV PORT=${PORT}

EXPOSE ${PORT}

CMD [ "pnpm", "start" ]
