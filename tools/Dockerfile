# Build

FROM node:lts as build
COPY . /work
WORKDIR /work
RUN tools/build-server.sh

# Production

FROM node:lts
COPY --from=build /work/dist/server /server
WORKDIR /server
RUN npm ci
EXPOSE 80
CMD node server.js
