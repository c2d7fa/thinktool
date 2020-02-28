FROM node

RUN mkdir /app
WORKDIR /app

RUN mkdir ./app
COPY ./app/package.json ./app/package.json
COPY ./app/package-lock.json ./app/package-lock.json
RUN cd ./app && npm ci

COPY ./app ./app

WORKDIR ./app
RUN npx eslint . --ext .ts --fix
RUN npx parcel build src/server.ts -d build -t node
RUN npx parcel build src/main.tsx -d build -o bundle.js

WORKDIR ./build
EXPOSE 80
CMD node server.js
