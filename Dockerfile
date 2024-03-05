FROM node:14

RUN addgroup --system nonroot
RUN adduser --system --ingroup nonroot nonroot

WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts
COPY src/ ./src

USER nonroot

EXPOSE 3000
CMD ["npm", "start"]