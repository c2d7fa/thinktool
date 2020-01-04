FROM node

RUN mkdir /app
WORKDIR /app

COPY ./app ./app

WORKDIR ./app
RUN npm ci
RUN npx eslint . --ext .ts --fix
RUN npx tsc
RUN npx webpack

WORKDIR ./build
EXPOSE 80
CMD node server.js
