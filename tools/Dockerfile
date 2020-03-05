# Build

FROM node as build
COPY . /work
WORKDIR /work
RUN tools/build.sh

# Production

FROM node
COPY --from=build /work/dist /dist
WORKDIR /dist/server
EXPOSE 80
CMD node server.js
