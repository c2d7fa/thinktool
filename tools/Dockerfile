# Build

FROM node:17.2 as build
COPY . /work
WORKDIR /work
RUN cd src/server && yarn run build

# Production

FROM node:17.2
COPY --from=build /work/src/server/ /server
WORKDIR /server
EXPOSE 80
CMD node dist/server.js
