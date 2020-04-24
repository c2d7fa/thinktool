# Build

FROM node:13 as build
COPY . /work
WORKDIR /work
RUN tools/build-server.sh

# Production

FROM node:13
COPY --from=build /work/dist/server /server
WORKDIR /server
EXPOSE 80
CMD node server.js
