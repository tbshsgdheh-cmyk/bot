FROM gradle:8.8-jdk21

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends nodejs npm \
  && rm -rf /var/lib/apt/lists/*

COPY . .

RUN ./gradlew installDist --no-daemon \
  && npm ci --omit=dev

ENV NODE_ENV=production

CMD ["npm", "start"]