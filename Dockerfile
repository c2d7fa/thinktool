FROM node
RUN mkdir /app
WORKDIR /app
COPY ./app ./app
COPY ./serve.js ./serve.js
RUN cd ./app && npm ci && npx webpack
CMD node ./serve.js
