FROM node

RUN mkdir /app
WORKDIR /app

COPY ./app ./app
COPY ./serve.js ./serve.js

RUN cd ./app && npm ci && npx webpack

EXPOSE 80
CMD node ./serve.js
