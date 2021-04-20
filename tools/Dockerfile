# Build

FROM node:15.14 as build
COPY . /work
WORKDIR /work
RUN tools/build-server.sh

# Production

FROM node:15.14
COPY --from=build /work/dist/server /server
WORKDIR /server
EXPOSE 80
CMD node server.js
